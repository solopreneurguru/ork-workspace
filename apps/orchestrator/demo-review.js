// Demo: Run code review
const { Reviewer } = require('./dist/tools/reviewer');
const fs = require('fs');
const path = require('path');

async function main() {
  const reviewer = new Reviewer();

  console.log('Running code review...\n');

  // Review current codebase
  const result = await reviewer.review();

  console.log('=== Review Results ===');
  console.log(`Ship: ${result.ship ? '✓ YES' : '✗ NO'}`);
  console.log(`Summary: ${result.summary}\n`);

  if (result.blockers.length > 0) {
    console.log('BLOCKERS:');
    result.blockers.forEach((b) => {
      console.log(`  [${b.severity.toUpperCase()}] ${b.file}:${b.line || '?'} - ${b.message}`);
    });
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log(`WARNINGS: ${result.warnings.length}`);
    result.warnings.slice(0, 5).forEach((w) => {
      console.log(`  [${w.severity}] ${w.file}:${w.line || '?'} - ${w.message}`);
    });
    if (result.warnings.length > 5) {
      console.log(`  ... and ${result.warnings.length - 5} more`);
    }
    console.log('');
  }

  console.log('COMPLIANCE:');
  console.log(`  License: ${result.compliance.license}`);
  console.log(`  Conflicts: ${result.compliance.conflicts.length}`);
  console.log('');

  console.log('STYLE:');
  console.log(`  Score: ${result.style.score}/100`);
  if (result.style.issues.length > 0) {
    console.log(`  Issues: ${result.style.issues.length}`);
  }
  console.log('');

  // Save review report
  const reportPath = path.join(__dirname, '../../artifacts/reports/review-latest.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  console.log(`Report saved: ${reportPath}`);

  process.exit(result.ship ? 0 : 1);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
