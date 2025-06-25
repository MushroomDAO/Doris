export default {
  // Test environment
  testEnvironment: 'node',
  
  // File extensions to consider for testing
  moduleFileExtensions: ['js', 'json'],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Coverage settings for v0.1 core features
  collectCoverageFrom: [
    'scripts/**/*.js',
    'src/**/*.js',
    '!src/local/**/*.js', // Exclude local services for v0.1
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  
  // Coverage thresholds for quality assurance (relaxed for v0.1)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Clear mocks automatically between tests
  clearMocks: true,
  
  // Restore mocks automatically between tests
  restoreMocks: true,
  
  // Test timeout (30 seconds for API tests)
  testTimeout: 30000,
  
  // Transform settings for ES modules
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module paths for easier imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@scripts/(.*)$': '<rootDir>/scripts/$1',
    '^@src/(.*)$': '<rootDir>/src/$1'
  },
  
  // Verbose output for development
  verbose: true,
  
  // Collect coverage reports (disabled for v0.1)
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Global variables available in tests
  globals: {
    'process.env.NODE_ENV': 'test'
  }
}; 