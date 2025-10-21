// ORK Observer - Simple web UI for viewing artifacts, logs, and costs
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.OBSERVER_PORT || 3002;

const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');
const WORKSPACE_DIR = path.join(__dirname, 'workspace');
const PLANS_DIR = path.join(__dirname, 'plans');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: List artifacts
app.get('/api/artifacts', (req, res) => {
  const artifacts = {
    screenshots: [],
    reports: [],
    diffs: [],
  };

  const uiDir = path.join(ARTIFACTS_DIR, 'ui');
  if (fs.existsSync(uiDir)) {
    const sessions = fs.readdirSync(uiDir).filter((f) =>
      fs.statSync(path.join(uiDir, f)).isDirectory()
    );
    artifacts.screenshots = sessions;
  }

  const reportsDir = path.join(ARTIFACTS_DIR, 'reports');
  if (fs.existsSync(reportsDir)) {
    artifacts.reports = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.md') || f.endsWith('.json') || f.endsWith('.yaml'));
  }

  res.json(artifacts);
});

// API: Get latest report
app.get('/api/reports/latest', (req, res) => {
  const reportsDir = path.join(ARTIFACTS_DIR, 'reports');
  if (!fs.existsSync(reportsDir)) {
    return res.status(404).json({ error: 'No reports found' });
  }

  const reports = fs.readdirSync(reportsDir)
    .filter((f) => f.startsWith('report-') && f.endsWith('.md'))
    .sort()
    .reverse();

  if (reports.length === 0) {
    return res.status(404).json({ error: 'No reports found' });
  }

  const latestReport = fs.readFileSync(path.join(reportsDir, reports[0]), 'utf-8');
  res.json({ filename: reports[0], content: latestReport });
});

// API: Get review status
app.get('/api/review/latest', (req, res) => {
  const reviewPath = path.join(ARTIFACTS_DIR, 'reports', 'review-latest.json');
  if (!fs.existsSync(reviewPath)) {
    return res.status(404).json({ error: 'No review found' });
  }

  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf-8'));
  res.json(review);
});

// API: Get plans
app.get('/api/plans', (req, res) => {
  if (!fs.existsSync(PLANS_DIR)) {
    return res.json({ plans: [] });
  }

  const plans = fs.readdirSync(PLANS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({
      filename: f,
      path: path.join(PLANS_DIR, f),
    }));

  res.json({ plans });
});

// API: Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'observer' });
});

// Serve index HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ORK Observer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #58a6ff; margin-bottom: 10px; font-size: 32px; }
    h2 { color: #8b949e; margin: 30px 0 15px; font-size: 20px; border-bottom: 1px solid #21262d; padding-bottom: 10px; }
    .subtitle { color: #8b949e; margin-bottom: 30px; }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status.success { background: #1f6f42; color: #7ee787; }
    .status.fail { background: #8e1519; color: #ff7b72; }
    .metric { display: inline-block; margin-right: 30px; margin-bottom: 10px; }
    .metric-label { color: #8b949e; font-size: 12px; text-transform: uppercase; }
    .metric-value { color: #c9d1d9; font-size: 24px; font-weight: 600; }
    .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .screenshot { background: #0d1117; border: 1px solid #30363d; border-radius: 4px; padding: 10px; text-align: center; }
    .screenshot img { max-width: 100%; height: auto; border-radius: 4px; }
    .screenshot-name { color: #8b949e; font-size: 12px; margin-top: 8px; }
    pre {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.6;
    }
    .loading { color: #8b949e; text-align: center; padding: 40px; }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 ORK Observer</h1>
    <div class="subtitle">Real-time orchestration monitoring • Artifacts • Costs • Timeline</div>

    <div class="card">
      <h2>System Status</h2>
      <div class="metric">
        <div class="metric-label">Orchestrator</div>
        <div class="metric-value" id="orchestrator-status">Checking...</div>
      </div>
      <div class="metric">
        <div class="metric-label">Verifier</div>
        <div class="metric-value" id="verifier-status">Checking...</div>
      </div>
    </div>

    <div class="card" id="review-card" style="display:none;">
      <h2>Latest Review</h2>
      <div id="review-content"></div>
    </div>

    <div class="card" id="report-card" style="display:none;">
      <h2>Latest Report</h2>
      <pre id="report-content"></pre>
    </div>

    <div class="card" id="artifacts-card">
      <h2>Artifacts</h2>
      <div class="loading">Loading artifacts...</div>
    </div>
  </div>

  <script>
    async function checkHealth(service, port, elementId) {
      try {
        const res = await fetch(\`http://localhost:\${port}/health\`);
        const data = await res.json();
        document.getElementById(elementId).innerHTML = '<span class="status success">ONLINE</span>';
      } catch (error) {
        document.getElementById(elementId).innerHTML = '<span class="status fail">OFFLINE</span>';
      }
    }

    async function loadReview() {
      try {
        const res = await fetch('/api/review/latest');
        const data = await res.json();
        const card = document.getElementById('review-card');
        const content = document.getElementById('review-content');

        const shipStatus = data.ship
          ? '<span class="status success">✓ SHIP</span>'
          : '<span class="status fail">✗ BLOCKED</span>';

        content.innerHTML = \`
          <div style="margin-bottom: 20px;">\${shipStatus}</div>
          <div class="metric">
            <div class="metric-label">Blockers</div>
            <div class="metric-value">\${data.blockers.length}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Warnings</div>
            <div class="metric-value">\${data.warnings.length}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Style Score</div>
            <div class="metric-value">\${data.style.score}/100</div>
          </div>
        \`;

        card.style.display = 'block';
      } catch (error) {
        console.log('No review available yet');
      }
    }

    async function loadReport() {
      try {
        const res = await fetch('/api/reports/latest');
        const data = await res.json();
        const card = document.getElementById('report-card');
        const content = document.getElementById('report-content');

        content.textContent = data.content;
        card.style.display = 'block';
      } catch (error) {
        console.log('No report available yet');
      }
    }

    async function loadArtifacts() {
      try {
        const res = await fetch('/api/artifacts');
        const data = await res.json();
        const card = document.getElementById('artifacts-card');

        let html = '<h3 style="color: #8b949e; margin-bottom: 15px;">Screenshots</h3>';

        if (data.screenshots.length > 0) {
          html += '<div class="screenshot-grid">';
          data.screenshots.forEach(session => {
            html += \`<div class="screenshot"><div class="screenshot-name">\${session}</div></div>\`;
          });
          html += '</div>';
        } else {
          html += '<p style="color: #8b949e;">No screenshots captured yet</p>';
        }

        html += '<h3 style="color: #8b949e; margin: 30px 0 15px;">Reports</h3>';

        if (data.reports.length > 0) {
          html += '<ul style="list-style: none;">';
          data.reports.forEach(report => {
            html += \`<li style="padding: 8px 0; border-bottom: 1px solid #21262d;"><a href="/artifacts/reports/\${report}">\${report}</a></li>\`;
          });
          html += '</ul>';
        } else {
          html += '<p style="color: #8b949e;">No reports generated yet</p>';
        }

        card.innerHTML = html;
      } catch (error) {
        console.error('Error loading artifacts:', error);
      }
    }

    // Initial load
    checkHealth('orchestrator', 3001, 'orchestrator-status');
    checkHealth('verifier', 3003, 'verifier-status');
    loadReview();
    loadReport();
    loadArtifacts();

    // Refresh every 10 seconds
    setInterval(() => {
      checkHealth('orchestrator', 3001, 'orchestrator-status');
      checkHealth('verifier', 3003, 'verifier-status');
      loadReview();
      loadReport();
      loadArtifacts();
    }, 10000);
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(\`ORK Observer UI running on http://localhost:\${PORT}\`);
});
