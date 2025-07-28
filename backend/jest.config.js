module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    '!services/**/__tests__/**',
    '!services/**/node_modules/**'
  ],
  verbose: true
};