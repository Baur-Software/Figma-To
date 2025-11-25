/**
 * E2E Tests: Full Pipeline
 *
 * Tests the complete flow from Figma input to CSS output using
 * the convenience functions.
 */

import { test, expect } from '@playwright/test';
import {
  figmaToTailwind,
  parseTheme,
  generateOutput,
} from '../../dist/index.js';
import {
  mockFigmaVariablesResponse,
  mockFigmaMCPResponse,
} from './fixtures/figma-variables.js';

test.describe('Full Pipeline', () => {
  test.describe('figmaToTailwind convenience function', () => {
    test('converts REST API response to CSS in one call', async () => {
      const output = await figmaToTailwind({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // Should produce valid CSS output
      expect(output.css).toBeTruthy();
      expect(output.css.length).toBeGreaterThan(100);

      // Should have Tailwind theme
      expect(output.tailwind.themeCss).toContain('@theme {');

      // Should have Ionic theme
      expect(output.ionic.css).toContain('--ion-color-');
    });

    test('converts MCP response to CSS in one call', async () => {
      const output = await figmaToTailwind({
        mcpData: mockFigmaMCPResponse,
      });

      expect(output.css).toBeTruthy();
      expect(output.tailwind.themeCss).toContain('@theme {');
    });

    test('accepts adapter options', async () => {
      const output = await figmaToTailwind(
        { variablesResponse: mockFigmaVariablesResponse },
        {
          framework: 'solidjs',
          tailwind: { colorFormat: 'hex' },
        }
      );

      expect(output.css).toContain('SolidJS');
      expect(output.tailwind.themeCss).toMatch(/#[0-9a-f]{6}/i);
    });
  });

  test.describe('parseTheme + generateOutput workflow', () => {
    test('separates parsing and generation steps', async () => {
      // Step 1: Parse Figma data to theme
      const theme = await parseTheme({
        variablesResponse: mockFigmaVariablesResponse,
      });

      expect(theme.collections.length).toBeGreaterThan(0);
      expect(theme.name).toBeTruthy();

      // Step 2: Generate output from theme
      const output = await generateOutput(theme);

      expect(output.css).toBeTruthy();
      expect(output.tailwind.themeCss).toContain('@theme {');
    });

    test('allows theme inspection before output generation', async () => {
      const theme = await parseTheme({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // Inspect theme structure
      const collectionNames = theme.collections.map(c => c.name);
      expect(collectionNames).toContain('Colors');
      expect(collectionNames).toContain('Spacing');
      expect(collectionNames).toContain('Typography');

      // Check modes
      const colorCollection = theme.collections.find(c => c.name === 'Colors');
      expect(colorCollection?.modes).toContain('Light');
      expect(colorCollection?.modes).toContain('Dark');
    });

    test('allows generating output with different options', async () => {
      const theme = await parseTheme({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // Generate with hex colors
      const hexOutput = await generateOutput(theme, {
        tailwind: { colorFormat: 'hex' },
      });

      // Generate with oklch colors
      const oklchOutput = await generateOutput(theme, {
        tailwind: { colorFormat: 'oklch' },
      });

      expect(hexOutput.tailwind.themeCss).toMatch(/#[0-9a-f]{6}/i);
      expect(oklchOutput.tailwind.themeCss).toMatch(/oklch\(/);
    });
  });

  test.describe('CSS Output Validity', () => {
    test('produces syntactically valid CSS', async () => {
      const output = await figmaToTailwind({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // Check balanced braces in combined CSS
      const openBraces = (output.css.match(/{/g) || []).length;
      const closeBraces = (output.css.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);

      // Check balanced braces in Tailwind theme
      const themeOpenBraces = (output.tailwind.themeCss.match(/{/g) || []).length;
      const themeCloseBraces = (output.tailwind.themeCss.match(/}/g) || []).length;
      expect(themeOpenBraces).toBe(themeCloseBraces);
    });

    test('produces valid CSS variable declarations', async () => {
      const output = await figmaToTailwind({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // All variable declarations should have valid format
      const variableDeclarations = output.css.match(/--[\w-]+:\s*[^;]+;/g) || [];
      expect(variableDeclarations.length).toBeGreaterThan(0);

      for (const declaration of variableDeclarations) {
        // Should match pattern: --name: value;
        expect(declaration).toMatch(/^--[\w-]+:\s*.+;$/);
      }
    });

    test('color values are valid', async () => {
      const output = await figmaToTailwind({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // Check hex colors in Ionic output
      const hexColors = output.ionic.css.match(/#[0-9a-f]{6}/gi) || [];
      expect(hexColors.length).toBeGreaterThan(0);

      for (const hex of hexColors) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      }

      // Check RGB triplets for Ionic
      const rgbTriplets = output.ionic.css.match(/\d{1,3},\s*\d{1,3},\s*\d{1,3}/g) || [];
      expect(rgbTriplets.length).toBeGreaterThan(0);
    });
  });

  test.describe('Color Conversion Accuracy', () => {
    test('converts Figma colors to correct hex values', async () => {
      const output = await figmaToTailwind(
        { variablesResponse: mockFigmaVariablesResponse },
        { tailwind: { colorFormat: 'hex' } }
      );

      // Primary color should be approximately #3880f6 (Figma: r=0.2196, g=0.5020, b=0.9647)
      // Allow for rounding differences
      const ionicPrimary = output.ionic.theme.colors?.primary?.base;
      if (ionicPrimary) {
        // Extract RGB values from hex
        const r = parseInt(ionicPrimary.slice(1, 3), 16);
        const g = parseInt(ionicPrimary.slice(3, 5), 16);
        const b = parseInt(ionicPrimary.slice(5, 7), 16);

        // Should be close to original values (0.2196*255, 0.5020*255, 0.9647*255)
        expect(r).toBeGreaterThan(50);
        expect(r).toBeLessThan(70);
        expect(g).toBeGreaterThan(120);
        expect(g).toBeLessThan(140);
        expect(b).toBeGreaterThan(240);
        expect(b).toBeLessThan(255);
      }
    });

    test('generates correct contrast colors', async () => {
      const output = await figmaToTailwind({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // Primary color is dark-ish blue, should have white contrast
      const primaryContrast = output.ionic.theme.colors?.primary?.contrast;
      if (primaryContrast) {
        // Should be white (#ffffff) or very light
        const r = parseInt(primaryContrast.slice(1, 3), 16);
        const g = parseInt(primaryContrast.slice(3, 5), 16);
        const b = parseInt(primaryContrast.slice(5, 7), 16);

        expect(r).toBeGreaterThan(200);
        expect(g).toBeGreaterThan(200);
        expect(b).toBeGreaterThan(200);
      }
    });
  });

  test.describe('Dimension Conversion', () => {
    test('converts spacing values to px dimensions', async () => {
      const output = await figmaToTailwind({
        variablesResponse: mockFigmaVariablesResponse,
      });

      // Spacing values should have px units
      expect(output.tailwind.themeCss).toMatch(/--spacing-[\w-]+:\s*\d+px/);
    });

    test('preserves numeric values correctly', async () => {
      const theme = await parseTheme({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const spacingCollection = theme.collections.find(c => c.name === 'Spacing');
      const defaultTokens = spacingCollection?.tokens['Default'];

      // Check specific spacing value
      const spacing = (defaultTokens?.['spacing'] as Record<string, unknown>);
      const spacing4 = spacing?.['4'] as { $value: { value: number } };

      expect(spacing4?.$value.value).toBe(16);
    });
  });

  test.describe('Token References', () => {
    test('preserves alias references in theme', async () => {
      const theme = await parseTheme({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const componentsCollection = theme.collections.find(c => c.name === 'Components');
      const lightTokens = componentsCollection?.tokens['Light'];

      const components = (lightTokens?.['components'] as Record<string, unknown>);
      const button = (components?.['button'] as Record<string, unknown>);
      const background = button?.['background'] as { $value: { $ref: string } };

      // Should be a reference, not resolved value
      expect(background?.$value.$ref).toBeDefined();
      expect(background?.$value.$ref).toContain('colors.primary');
    });
  });

  test.describe('Error Handling', () => {
    test('throws on invalid input', async () => {
      await expect(figmaToTailwind({})).rejects.toThrow();
    });

    test('throws descriptive error message', async () => {
      try {
        await figmaToTailwind({});
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid Figma input');
      }
    });
  });
});
