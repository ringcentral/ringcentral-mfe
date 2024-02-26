/** @type {import('ts-jest').JestConfigWithTsJest} */

const reporterPublicPath = '<rootDir>/jest-html-report/';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/', 'base'],
  rootDir: './e2e',
  modulePathIgnorePatterns: ['/dist/'],
  testMatch: [`**/*.test?(s).[jt]s?(x)`],
  watchPathIgnorePatterns: [reporterPublicPath],
  globalSetup: '<rootDir>/setup.ts',
  globalTeardown: '<rootDir>/teardown.ts',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: reporterPublicPath,
        filename: 'jest-html-report.html',
      },
    ],
  ],
};
