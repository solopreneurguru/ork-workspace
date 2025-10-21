// Demo: Generate final execution report
const { Reporter } = require('./dist/tools/reporter');
const fs = require('fs');
const path = require('path');

async function main() {
  const reporter = new Reporter();

  const planFile = path.join(__dirname, '../../plans/plan-001.md');
  const reviewFile = path.join(__dirname, '../../artifacts/reports/review-latest.json');
  const baseDir = path.join(__dirname, '../..');

  console.log('Generating final execution report...\n');

  const report = reporter.generateReport({
    planFile,
    reviewFile,
    baseDir,
  });

  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const reportPath = path.join(__dirname, `../../artifacts/reports/report-${timestamp}.md`);

  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log('=== Report Generated ===');
  console.log(`Path: ${reportPath}`);
  console.log(`Size: ${report.length} characters\n`);

  // Display preview
  console.log('--- PREVIEW ---');
  const lines = report.split('\n');
  console.log(lines.slice(0, 30).join('\n'));
  console.log('\n... (truncated)\n');
  console.log(`Full report: ${reportPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
