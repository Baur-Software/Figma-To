/**
 * SCSS Input Adapter E2E Tests
 */

import { test, expect } from '@playwright/test';
import {
  createSCSSAdapter,
  extractScssVariables,
  extractScssMaps,
  scssVariableToPath,
  resolveScssReference,
  scssTokensToGroup,
  extractAllScssTokens,
} from '../../dist/adapters/input/scss/index.js';

// =============================================================================
// Test SCSS Fixtures
// =============================================================================

const basicScss = `
$color-primary: #3880f6;
$color-secondary: #3cd6af;
$spacing-4: 16px;
$font-family-sans: "Inter", sans-serif;
`;

const scssWithDefaults = `
$color-primary: #3880f6 !default;
$color-secondary: #3cd6af !default;
$spacing-4: 16px !default;
`;

const scssWithMaps = `
$color-primary: #3880f6;
$color-secondary: #3cd6af;

$colors: (
  "primary": $color-primary,
  "secondary": $color-secondary,
  "success": #22c55e,
) !default;

$spacing: (
  "1": 4px,
  "2": 8px,
  "4": 16px,
  "8": 32px,
);
`;

const scssWithReferences = `
$base-color: #3880f6;
$color-primary: $base-color;
$color-primary-light: lighten($base-color, 10%);
`;

const complexScss = `
// Design System Variables
// =============================================================================

// Colors
$color-primary-500: #3880f6;
$color-primary-600: #3171d8;
$color-secondary-500: #3cd6af;
$color-success: #22c55e;
$color-danger: #ef4444;

// Spacing
$spacing-1: 4px !default;
$spacing-2: 8px !default;
$spacing-4: 16px !default;
$spacing-8: 32px !default;

// Typography
$font-family-sans: "Inter", "Helvetica Neue", sans-serif;
$font-family-mono: "Fira Code", monospace;
$font-weight-normal: 400;
$font-weight-bold: 700;
$font-size-sm: 0.875rem;
$font-size-base: 1rem;
$font-size-lg: 1.125rem;

// Border Radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 16px;

// Shadows
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);

// Maps
$colors: (
  "primary-500": $color-primary-500,
  "primary-600": $color-primary-600,
  "secondary-500": $color-secondary-500,
  "success": $color-success,
  "danger": $color-danger,
);

$fonts: (
  "sans": $font-family-sans,
  "mono": $font-family-mono,
);
`;

// =============================================================================
// Adapter Tests
// =============================================================================

test.describe('SCSS Input Adapter', () => {
  test.describe('Adapter Creation', () => {
    test('createSCSSAdapter creates adapter instance', async () => {
      const adapter = createSCSSAdapter();
      expect(adapter.id).toBe('scss');
      expect(adapter.name).toBe('SCSS Input Adapter');
    });
  });

  test.describe('Validation', () => {
    test('rejects empty input', async () => {
      const adapter = createSCSSAdapter();
      const result = await adapter.validate({ scss: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SCSS content is empty');
    });

    test('rejects missing scss property', async () => {
      const adapter = createSCSSAdapter();
      const result = await adapter.validate({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SCSS content is required');
    });

    test('accepts valid SCSS', async () => {
      const adapter = createSCSSAdapter();
      const result = await adapter.validate({ scss: basicScss });
      expect(result.valid).toBe(true);
    });
  });

  test.describe('Parsing', () => {
    test('parses basic $variables', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({ scss: basicScss });

      expect(theme.name).toBe('SCSS Theme');
      expect(theme.collections).toHaveLength(1);
      expect(theme.collections[0].modes).toContain('default');
    });

    test('parses variables with !default flag', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({ scss: scssWithDefaults });

      const collection = theme.collections[0];
      expect(collection.tokens['default']).toBeDefined();
    });

    test('parses SCSS maps', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({ scss: scssWithMaps });

      const tokens = theme.collections[0].tokens['default'];
      expect(tokens.colors).toBeDefined();
      expect(tokens.spacing).toBeDefined();
    });

    test('custom collection name', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({
        scss: basicScss,
        options: { collectionName: 'Brand Tokens' },
      });

      expect(theme.collections[0].name).toBe('Brand Tokens');
    });

    test('custom file name', async () => {
      const adapter = createSCSSAdapter();
      const theme = await adapter.parse({
        scss: basicScss,
        fileName: '_variables.scss',
      });

      expect(theme.name).toBe('_variables.scss');
    });
  });
});

// =============================================================================
// Parser Tests
// =============================================================================

test.describe('SCSS Parser', () => {
  test.describe('extractScssVariables', () => {
    test('extracts simple variables', async () => {
      const vars = extractScssVariables(basicScss);
      expect(vars.length).toBe(4);
      expect(vars.some(v => v.name === 'color-primary')).toBe(true);
      expect(vars.some(v => v.name === 'spacing-4')).toBe(true);
    });

    test('detects !default flag', async () => {
      const vars = extractScssVariables(scssWithDefaults);
      expect(vars.every(v => v.hasDefault)).toBe(true);
    });

    test('excludes map definitions', async () => {
      const vars = extractScssVariables(scssWithMaps);
      // Should get the simple variables, not the maps
      expect(vars.some(v => v.name === 'color-primary')).toBe(true);
      expect(vars.some(v => v.name === 'colors')).toBe(false);
    });

    test('includes line numbers', async () => {
      const vars = extractScssVariables(basicScss);
      expect(vars[0].line).toBeDefined();
      expect(vars[0].line).toBeGreaterThan(0);
    });
  });

  test.describe('extractScssMaps', () => {
    test('extracts maps', async () => {
      const maps = extractScssMaps(scssWithMaps);
      expect(maps.length).toBe(2);
      expect(maps.some(m => m.name === 'colors')).toBe(true);
      expect(maps.some(m => m.name === 'spacing')).toBe(true);
    });

    test('parses map entries', async () => {
      const maps = extractScssMaps(scssWithMaps);
      const colorsMap = maps.find(m => m.name === 'colors');

      expect(colorsMap).toBeDefined();
      expect(colorsMap!.entries.length).toBe(3);
      expect(colorsMap!.entries.some(e => e.key === 'primary')).toBe(true);
    });

    test('detects !default on maps', async () => {
      const maps = extractScssMaps(scssWithMaps);
      const colorsMap = maps.find(m => m.name === 'colors');
      const spacingMap = maps.find(m => m.name === 'spacing');

      expect(colorsMap!.hasDefault).toBe(true);
      expect(spacingMap!.hasDefault).toBe(false);
    });
  });

  test.describe('scssVariableToPath', () => {
    test('converts dashes to slashes', async () => {
      expect(scssVariableToPath('color-primary-500')).toBe('color/primary/500');
    });

    test('handles Tailwind conventions', async () => {
      expect(scssVariableToPath('font-family-sans')).toBe('fontFamily/sans');
      expect(scssVariableToPath('font-size-lg')).toBe('fontSize/lg');
      expect(scssVariableToPath('font-weight-bold')).toBe('fontWeight/bold');
    });

    test('strips prefix when specified', async () => {
      expect(scssVariableToPath('theme-color-primary', 'theme-')).toBe('color/primary');
    });
  });

  test.describe('resolveScssReference', () => {
    test('resolves variable references', async () => {
      const vars = new Map([
        ['base-color', '#3880f6'],
        ['color-primary', '$base-color'],
      ]);

      expect(resolveScssReference('$base-color', vars)).toBe('#3880f6');
      expect(resolveScssReference('$color-primary', vars)).toBe('#3880f6');
    });

    test('returns literal values unchanged', async () => {
      const vars = new Map<string, string>();
      expect(resolveScssReference('#3880f6', vars)).toBe('#3880f6');
      expect(resolveScssReference('16px', vars)).toBe('16px');
    });

    test('returns unresolved references as-is', async () => {
      const vars = new Map<string, string>();
      expect(resolveScssReference('$unknown', vars)).toBe('$unknown');
    });
  });
});

// =============================================================================
// Token Group Tests
// =============================================================================

test.describe('SCSS Tokens to Group', () => {
  test('builds nested structure from paths', async () => {
    const tokens = [
      { path: 'color/primary/500', type: 'color' as const, value: { r: 0, g: 0, b: 1, a: 1 }, originalName: 'color-primary-500' },
      { path: 'color/primary/600', type: 'color' as const, value: { r: 0, g: 0, b: 0.8, a: 1 }, originalName: 'color-primary-600' },
      { path: 'spacing/4', type: 'dimension' as const, value: { value: 16, unit: 'px' }, originalName: 'spacing-4' },
    ];

    const group = scssTokensToGroup(tokens);

    expect(group.color).toBeDefined();
    expect((group.color as any).primary).toBeDefined();
    expect((group.color as any).primary['500'].$type).toBe('color');
    expect(group.spacing).toBeDefined();
    expect((group.spacing as any)['4'].$value).toEqual({ value: 16, unit: 'px' });
  });
});

// =============================================================================
// Extract All Tokens Tests
// =============================================================================

test.describe('Extract All SCSS Tokens', () => {
  test('extracts variables and maps together', async () => {
    const tokens = extractAllScssTokens(scssWithMaps);

    // Should have variables
    expect(tokens.some(t => t.originalName === 'color-primary')).toBe(true);

    // Should have map entries
    expect(tokens.some(t => t.fromMap === 'colors')).toBe(true);
    expect(tokens.some(t => t.fromMap === 'spacing')).toBe(true);
  });

  test('can disable map parsing', async () => {
    const tokens = extractAllScssTokens(scssWithMaps, { parseMaps: false });

    expect(tokens.some(t => t.originalName === 'color-primary')).toBe(true);
    expect(tokens.every(t => !t.fromMap)).toBe(true);
  });

  test('resolves variable references in maps', async () => {
    const tokens = extractAllScssTokens(scssWithMaps);

    // Find the primary color from the map
    const primaryFromMap = tokens.find(t => t.originalName === 'colors.primary');
    expect(primaryFromMap).toBeDefined();
    // Value should be resolved, not $color-primary
    expect(primaryFromMap!.type).toBe('color');
  });
});

// =============================================================================
// Full Integration Tests
// =============================================================================

test.describe('SCSS Full Integration', () => {
  test('parses complex SCSS with all features', async () => {
    const adapter = createSCSSAdapter();
    const theme = await adapter.parse({ scss: complexScss });

    expect(theme.collections).toHaveLength(1);
    const tokens = theme.collections[0].tokens['default'];

    // Check color tokens
    expect(tokens.color).toBeDefined();

    // Check spacing tokens
    expect(tokens.spacing).toBeDefined();

    // Check font tokens
    expect(tokens.fontFamily).toBeDefined();

    // Check map-derived tokens
    expect(tokens.colors).toBeDefined();
    expect(tokens.fonts).toBeDefined();
  });

  test('round-trip: SCSS parsed correctly builds valid theme', async () => {
    const adapter = createSCSSAdapter();
    const theme = await adapter.parse({ scss: basicScss });

    // Verify structure
    expect(theme.$schema).toBeDefined();
    expect(theme.collections[0].tokens['default']).toBeDefined();
    expect(theme.meta?.source).toBe('manual');
  });

  test('preserves token types correctly', async () => {
    const adapter = createSCSSAdapter();
    const theme = await adapter.parse({ scss: complexScss });

    const tokens = theme.collections[0].tokens['default'];

    // Colors should be color type
    const colorToken = (tokens.color as any)?.primary?.['500'];
    if (colorToken) {
      expect(colorToken.$type).toBe('color');
    }

    // Spacing should be dimension type
    const spacingToken = (tokens.spacing as any)?.['4'];
    if (spacingToken) {
      expect(spacingToken.$type).toBe('dimension');
    }
  });
});
