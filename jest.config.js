module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    // Binary assets first: reciters.ts require()s the bundled mp3s, which Jest
    // cannot parse. Must precede the '@/' rule so it wins for asset paths.
    '\\.(mp3|wav|m4a|png|jpe?g|gif|webp|svg|ttf|otf)$': '<rootDir>/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: {
        // Ignore type errors from source files (adhan uses enum patterns
        // that ts-jest's isolated module compilation doesn't support well)
        ignoreDiagnostics: [2353, 7015],
      },
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowJs: true,
        strict: false,
        paths: {
          '@/*': ['./*'],
        },
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(adhan)/)',
  ],
};
