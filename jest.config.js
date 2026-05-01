module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
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
