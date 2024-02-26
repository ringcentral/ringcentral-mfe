/** @type {import('ts-jest').JestConfigWithTsJest} */

const reporterPublicPath = '<rootDir>/jest-html-report/';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/', 'base'],
  rootDir: './it',
  modulePathIgnorePatterns: ['/dist/'],
  testMatch: [`**/*.test?(s).[jt]s?(x)`],
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
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/mocks/styleMock.js',
  },
  globals: {
    __DEV__: true,
  },
  setupFilesAfterEnv: ['../../scripts/jest.setup.ts'],
};
