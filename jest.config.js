/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/desktop'],
  testMatch: ['<rootDir>/desktop/**/*.test.{js,ts,tsx}', '<rootDir>/desktop/**/*.spec.{js,ts,tsx}'],
  testPathIgnorePatterns: [
    '<rootDir>/desktop/build-installer-interface.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.cache/',
  ],
  collectCoverageFrom: [
    'desktop/build-cache-root.js',
    'desktop/build-installer-interface.ts',
    'desktop/build-installer.cjs',
    'desktop/error-handling.interface.ts',
    'desktop/error-handling.interface.test.ts',
    'desktop/toolchain-download.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.js$': ['babel-jest'],
    '^.+\\.tsx?$': ['ts-jest'],
  },
};