/**
 * Jest config for Detox E2E (separate from the unit-test jest config at the repo
 * root, which runs ts-jest over __tests__/). Detox drives a real app on a device,
 * so it uses jest-circus + the Detox environment and a long per-test timeout.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 180000,
  maxWorkers: 1, // one device, serial specs
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
