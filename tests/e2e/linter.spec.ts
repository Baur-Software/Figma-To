/**
 * E2E Tests: Token Linter
 *
 * Tests the linting system including rules, config, and presets.
 */

import { test, expect } from '@playwright/test';
import {
  lintTheme,
  createLinter,
  parseTheme,
  getPreset,
  listPresets,
  type LintConfig,
  type ThemeFile,
} from '../../dist/index.js';
import { mockFigmaVariablesResponse } from './fixtures/figma-variables.js';

// =============================================================================
// Test Fixtures
// =============================================================================

/** Create a minimal valid theme for testing */
function createTestTheme(overrides: Partial<ThemeFile> = {}): ThemeFile {
  return {
    $schema: 'https://example.com/schema.json',
    name: 'Test Theme',
    collections: [],
    ...overrides,
  };
}

/** Create a theme with specific token issues for testing rules */
function createThemeWithIssues(): ThemeFile {
  return {
    $schema: 'https://example.com/schema.json',
    name: 'Theme With Issues',
    collections: [
      {
        name: 'colors',
        modes: ['light', 'dark'],
        tokens: {
          light: {
            // Valid token
            primary: {
              $type: 'color',
              $value: { r: 0.2, g: 0.5, b: 0.9, a: 1 },
              $description: 'Primary color',
            },
            // Duplicate value
            'primary-copy': {
              $type: 'color',
              $value: { r: 0.2, g: 0.5, b: 0.9, a: 1 },
            },
            // Invalid color value (out of range)
            invalid: {
              $type: 'color',
              $value: { r: 1.5, g: 0.5, b: 0.9, a: 1 },
            },
            // Deep nesting
            deeply: {
              nested: {
                token: {
                  structure: {
                    here: {
                      $type: 'color',
                      $value: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
                    },
                  },
                },
              },
            },
          },
          dark: {
            primary: {
              $type: 'color',
              $value: { r: 0.3, g: 0.6, b: 1.0, a: 1 },
            },
          },
        },
      },
      {
        name: 'mixed-naming',
        modes: ['default'],
        tokens: {
          default: {
            // kebab-case
            'my-color': {
              $type: 'color',
              $value: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
            },
            // camelCase (inconsistent)
            myOtherColor: {
              $type: 'color',
              $value: { r: 0.4, g: 0.5, b: 0.6, a: 1 },
            },
          },
        },
      },
      {
        name: 'invalid-names',
        modes: ['default'],
        tokens: {
          default: {
            // Invalid: starts with number
            '123-color': {
              $type: 'color',
              $value: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
            },
            // Invalid: special characters
            'color@special': {
              $type: 'color',
              $value: { r: 0.4, g: 0.5, b: 0.6, a: 1 },
            },
          },
        },
      },
      {
        name: 'empty-collection',
        modes: ['default'],
        tokens: {
          default: {},
        },
      },
      {
        name: 'broken-refs',
        modes: ['default'],
        tokens: {
          default: {
            alias: {
              $type: 'color',
              $value: { $ref: '{nonexistent.token}' },
            },
          },
        },
      },
    ],
  };
}

// =============================================================================
// Basic Linting Tests
// =============================================================================

test.describe('Token Linter', () => {
  test.describe('Basic Functionality', () => {
    test('lintTheme returns valid result structure', async () => {
      const theme = createTestTheme();
      const result = lintTheme(theme);

      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('errorCount');
      expect(result).toHaveProperty('warningCount');
      expect(result).toHaveProperty('infoCount');
      expect(result).toHaveProperty('passed');
      expect(Array.isArray(result.messages)).toBe(true);
    });

    test('empty theme passes linting', async () => {
      const theme = createTestTheme();
      const result = lintTheme(theme);

      expect(result.passed).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    test('lints real Figma data successfully', async () => {
      const theme = await parseTheme({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const result = lintTheme(theme);

      // Should return a valid result (may have warnings/info)
      expect(result).toHaveProperty('passed');
      expect(typeof result.errorCount).toBe('number');
    });

    test('createLinter returns reusable linter instance', async () => {
      const linter = createLinter();
      const theme = createTestTheme();

      const result1 = linter.lint(theme);
      const result2 = linter.lint(theme);

      expect(result1.passed).toBe(result2.passed);
    });
  });

  // ===========================================================================
  // Rule Tests
  // ===========================================================================

  test.describe('Rules', () => {
    test('invalid-color-value detects out-of-range RGB', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'invalid-color-value': 'error' },
      });

      const colorErrors = result.messages.filter(
        (m) => m.rule === 'invalid-color-value'
      );
      expect(colorErrors.length).toBeGreaterThan(0);
      expect(colorErrors[0].severity).toBe('error');
    });

    test('deep-nesting warns on deeply nested tokens', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'deep-nesting': 'warning' },
      });

      const nestingWarnings = result.messages.filter(
        (m) => m.rule === 'deep-nesting'
      );
      expect(nestingWarnings.length).toBeGreaterThan(0);
      expect(nestingWarnings[0].message).toContain('deep');
    });

    test('inconsistent-naming detects mixed conventions', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'inconsistent-naming': 'warning' },
      });

      const namingWarnings = result.messages.filter(
        (m) => m.rule === 'inconsistent-naming'
      );
      expect(namingWarnings.length).toBeGreaterThan(0);
    });

    test('invalid-token-name detects names starting with numbers', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'invalid-token-name': 'error' },
      });

      const nameErrors = result.messages.filter(
        (m) => m.rule === 'invalid-token-name'
      );
      expect(nameErrors.length).toBeGreaterThan(0);
      expect(nameErrors.some((m) => m.message.includes('starts with a number'))).toBe(true);
    });

    test('invalid-token-name detects special characters', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'invalid-token-name': 'error' },
      });

      const nameErrors = result.messages.filter(
        (m) => m.rule === 'invalid-token-name'
      );
      expect(nameErrors.some((m) => m.message.includes('invalid characters'))).toBe(true);
    });

    test('empty-collection warns about empty collections', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'empty-collection': 'warning' },
      });

      const emptyWarnings = result.messages.filter(
        (m) => m.rule === 'empty-collection'
      );
      expect(emptyWarnings.length).toBeGreaterThan(0);
      expect(emptyWarnings[0].message).toContain('empty-collection');
    });

    test('broken-reference detects invalid refs', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'broken-reference': 'error' },
      });

      const refErrors = result.messages.filter(
        (m) => m.rule === 'broken-reference'
      );
      expect(refErrors.length).toBeGreaterThan(0);
      expect(refErrors[0].message).toContain('not found');
    });

    test('duplicate-values detects duplicate token values', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'duplicate-values': 'info' },
      });

      const dupInfos = result.messages.filter(
        (m) => m.rule === 'duplicate-values'
      );
      expect(dupInfos.length).toBeGreaterThan(0);
    });

    test('missing-description reports tokens without descriptions', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'missing-description': 'info' },
      });

      const descInfos = result.messages.filter(
        (m) => m.rule === 'missing-description'
      );
      // Most tokens in our fixture don't have descriptions
      expect(descInfos.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Config Tests
  // ===========================================================================

  test.describe('Configuration', () => {
    test('rules can be disabled with false', async () => {
      const theme = createThemeWithIssues();

      const resultEnabled = lintTheme(theme, {
        rules: { 'invalid-color-value': 'error' },
      });
      const resultDisabled = lintTheme(theme, {
        rules: { 'invalid-color-value': false },
      });

      const enabledCount = resultEnabled.messages.filter(
        (m) => m.rule === 'invalid-color-value'
      ).length;
      const disabledCount = resultDisabled.messages.filter(
        (m) => m.rule === 'invalid-color-value'
      ).length;

      expect(enabledCount).toBeGreaterThan(0);
      expect(disabledCount).toBe(0);
    });

    test('rule severity can be changed', async () => {
      const theme = createThemeWithIssues();

      const resultWarning = lintTheme(theme, {
        rules: { 'deep-nesting': 'warning' },
      });
      const resultError = lintTheme(theme, {
        rules: { 'deep-nesting': 'error' },
      });

      const warnings = resultWarning.messages.filter(
        (m) => m.rule === 'deep-nesting'
      );
      const errors = resultError.messages.filter(
        (m) => m.rule === 'deep-nesting'
      );

      expect(warnings[0]?.severity).toBe('warning');
      expect(errors[0]?.severity).toBe('error');
    });

    test('errors cause passed to be false', async () => {
      const theme = createThemeWithIssues();

      const result = lintTheme(theme, {
        rules: {
          'invalid-color-value': 'error',
          'invalid-token-name': 'error',
        },
      });

      expect(result.passed).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
    });

    test('warnings only still passes', async () => {
      const theme: ThemeFile = {
        $schema: 'https://example.com/schema.json',
        name: 'Warning Only Theme',
        collections: [
          {
            name: 'test',
            modes: ['default'],
            tokens: {
              default: {
                deeply: {
                  nested: {
                    token: {
                      path: {
                        here: {
                          $type: 'color',
                          $value: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      };

      const result = lintTheme(theme, {
        rules: {
          'deep-nesting': 'warning',
          'invalid-color-value': false,
          'invalid-token-name': false,
          'broken-reference': false,
        },
      });

      expect(result.warningCount).toBeGreaterThan(0);
      expect(result.errorCount).toBe(0);
      expect(result.passed).toBe(true);
    });
  });

  // ===========================================================================
  // Preset Tests
  // ===========================================================================

  test.describe('Presets', () => {
    test('listPresets returns available presets', async () => {
      const presets = listPresets();

      expect(presets).toContain('recommended');
      expect(presets).toContain('strict');
      expect(presets).toContain('minimal');
    });

    test('getPreset returns preset config', async () => {
      const recommended = getPreset('recommended');
      const strict = getPreset('strict');
      const minimal = getPreset('minimal');

      expect(recommended).toHaveProperty('rules');
      expect(strict).toHaveProperty('rules');
      expect(minimal).toHaveProperty('rules');
    });

    test('recommended preset has balanced defaults', async () => {
      const preset = getPreset('recommended');

      expect(preset?.rules?.['invalid-color-value']).toBe('error');
      expect(preset?.rules?.['missing-description']).toBe('info');
    });

    test('strict preset upgrades rules to errors', async () => {
      const preset = getPreset('strict');

      expect(preset?.rules?.['inconsistent-naming']).toBe('error');
      expect(preset?.rules?.['deep-nesting']).toBe('error');
    });

    test('minimal preset disables non-critical rules', async () => {
      const preset = getPreset('minimal');

      expect(preset?.rules?.['missing-description']).toBe(false);
      expect(preset?.rules?.['duplicate-values']).toBe(false);
      expect(preset?.rules?.['invalid-color-value']).toBe('error');
    });

    test('invalid preset returns undefined', async () => {
      const preset = getPreset('nonexistent');
      expect(preset).toBeUndefined();
    });
  });

  // ===========================================================================
  // Message Format Tests
  // ===========================================================================

  test.describe('Message Format', () => {
    test('messages include rule id', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme);

      for (const msg of result.messages) {
        expect(msg.rule).toBeTruthy();
        expect(typeof msg.rule).toBe('string');
      }
    });

    test('messages include severity', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme);

      for (const msg of result.messages) {
        expect(['error', 'warning', 'info']).toContain(msg.severity);
      }
    });

    test('messages include human-readable text', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme);

      for (const msg of result.messages) {
        expect(msg.message).toBeTruthy();
        expect(msg.message.length).toBeGreaterThan(5);
      }
    });

    test('some messages include suggestions', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: { 'invalid-token-name': 'error' },
      });

      const messagesWithSuggestions = result.messages.filter(
        (m) => m.suggestion
      );
      expect(messagesWithSuggestions.length).toBeGreaterThan(0);
    });

    test('messages include collection context', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme);

      const messagesWithCollection = result.messages.filter(
        (m) => m.collection
      );
      expect(messagesWithCollection.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Count Tests
  // ===========================================================================

  test.describe('Counts', () => {
    test('errorCount matches error messages', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: {
          'invalid-color-value': 'error',
          'invalid-token-name': 'error',
        },
      });

      const errorMessages = result.messages.filter(
        (m) => m.severity === 'error'
      );
      expect(result.errorCount).toBe(errorMessages.length);
    });

    test('warningCount matches warning messages', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: {
          'deep-nesting': 'warning',
          'inconsistent-naming': 'warning',
        },
      });

      const warningMessages = result.messages.filter(
        (m) => m.severity === 'warning'
      );
      expect(result.warningCount).toBe(warningMessages.length);
    });

    test('infoCount matches info messages', async () => {
      const theme = createThemeWithIssues();
      const result = lintTheme(theme, {
        rules: {
          'missing-description': 'info',
          'duplicate-values': 'info',
        },
      });

      const infoMessages = result.messages.filter((m) => m.severity === 'info');
      expect(result.infoCount).toBe(infoMessages.length);
    });
  });
});
