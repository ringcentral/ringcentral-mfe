/** @type {import('ts-jest').JestConfigWithTsJest} */

const reporterPublicPath = '<rootDir>/jest-html-report/';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    'examples',
    'examples/base',
  ],
  modulePathIgnorePatterns: ['/dist/'],
  testMatch: [`**/test/*.test?(s).[jt]s?(x)`],
  watchPathIgnorePatterns: [reporterPublicPath],
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
  globals: {
    __DEV__: true,
  },
  setupFilesAfterEnv: ['../../scripts/jest.setup.ts'],
};
