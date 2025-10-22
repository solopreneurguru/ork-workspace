module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    '!apps/**/*.d.ts',
    '!apps/**/node_modules/**',
  ],
  modulePathIgnorePatterns: ['<rootDir>/apps/.*/node_modules/'],
  testTimeout: 30000,
};
