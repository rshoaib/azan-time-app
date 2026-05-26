module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Stub binary asset imports so tests don't try to load mp3/png/etc.
    '\\.(mp3|wav|m4a|aac|ogg|png|jpg|jpeg|gif|svg)$': '<rootDir>/__tests__/assetStub.js',
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
