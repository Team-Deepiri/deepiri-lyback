const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['src/**/*.test.js', 'src/**/*.spec.js'],
    globals: true,
    environment: 'node',
  },
});
