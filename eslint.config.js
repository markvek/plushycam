const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['.context/**', 'dist/**', 'playwright-report/**', 'test-results/**'] },
]);
