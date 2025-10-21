// Demo: Run browser verification and generate Playwright test
const { BrowserVerifier } = require('./dist/tools/verifier');
const path = require('path');

async function main() {
  const verifier = new BrowserVerifier();
  const checklistPath = path.join(__dirname, '../../checklists/auth.yaml');
  const outputTestPath = path.join(__dirname, 'generated-auth.spec.ts');

  console.log('Generating Playwright test from checklist...');
  verifier.generatePlaywrightTest(checklistPath, outputTestPath);
  console.log(`✓ Generated test: ${outputTestPath}`);

  console.log('\nRunning browser verification...');
  const result = await verifier.verify(checklistPath);

  console.log('\n=== Verification Results ===');
  console.log(`Status: ${result.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Checkpoints: ${result.checkpointsPassed}/${result.checkpointsTotal}`);
  console.log(`Screenshots: ${result.screenshotDir}`);

  if (result.failures.length > 0) {
    console.log('\nFailures:');
    result.failures.forEach((f) => {
      console.log(`  - ${f.checkpoint}: ${f.error}`);
    });
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
