import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

function warningLevel(setting) {
  if (setting === 0 || setting === 'off') return 'off';
  if (Array.isArray(setting)) {
    const [severity, ...options] = setting;
    if (severity === 0 || severity === 'off') return 'off';
    return ['warn', ...options];
  }
  return 'warn';
}

const nextRulesAsWarnings = Object.fromEntries(
  nextVitals.flatMap(config => Object.entries(config.rules ?? {})).map(([rule, setting]) => [rule, warningLevel(setting)])
);

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: nextRulesAsWarnings,
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
