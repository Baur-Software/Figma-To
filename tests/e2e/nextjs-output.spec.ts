/**
 * E2E Tests: Next.js Output Adapter
 *
 * Tests the Next.js output adapter with realistic mock data.
 */

import { test, expect } from '@playwright/test';
import { createFigmaAdapter } from '../../dist/adapters/input/figma/index.js';
import { createNextJsAdapter } from '../../dist/adapters/output/nextjs/index.js';
import { figmaToNextJs } from '../../dist/index.js';
import {
  mockFigmaVariablesResponse,
  mockMCPVariableDefs,
} from './fixtures/figma-variables.js';

test.describe('Next.js Output Adapter', () => {
  test.describe('CSS Generation', () => {
    test('generates CSS variables from Figma data', async () => {
      const figmaAdapter = createFigmaAdapter();
      const theme = await figmaAdapter.parse({
        variablesResponse: mockFigmaVariablesResponse,
      });

      const nextAdapter = createNextJsAdapter();
      const output = await nextAdapter.transform(theme);

      expect(output.css).toContain(':root {');
      expect(output.css).toContain('--');
    });

    test('generates color variables in hex format by default', async () => {
      const output = await figmaToNextJs({
        variableDefs: mockMCPVariableDefs,
      });

      // Check for hex color format
      expect(output.css).toMatch(/#[a-fA-F0-9]{6}/);
    });

    test('generates color variables in rgb format when specified', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { colorFormat: 'rgb' }
      );

      expect(output.css).toMatch(/rgb\(/);
    });

    test('generates color variables in hsl format when specified', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { colorFormat: 'hsl' }
      );

      expect(output.css).toMatch(/hsl\(/);
    });

    test('generates color variables in oklch format when specified', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { colorFormat: 'oklch' }
      );

      expect(output.css).toMatch(/oklch\(/);
    });

    test('applies CSS variable prefix when specified', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { cssPrefix: 'ds' }
      );

      expect(output.css).toContain('--ds-');
    });
  });

  test.describe('Dark Mode Support', () => {
    test('generates dark mode CSS with class strategy by default', async () => {
      const output = await figmaToNextJs(
        { variablesResponse: mockFigmaVariablesResponse },
        { darkMode: true }
      );

      expect(output.css).toContain('.dark {');
    });

    test('generates dark mode CSS with media query strategy', async () => {
      const output = await figmaToNextJs(
        { variablesResponse: mockFigmaVariablesResponse },
        { darkMode: true, darkModeStrategy: 'media' }
      );

      expect(output.css).toContain('@media (prefers-color-scheme: dark)');
    });

    test('generates dark mode CSS with selector strategy', async () => {
      const output = await figmaToNextJs(
        { variablesResponse: mockFigmaVariablesResponse },
        { darkMode: true, darkModeStrategy: 'selector' }
      );

      expect(output.css).toContain('[data-theme="dark"]');
    });

    test('can disable dark mode generation', async () => {
      const output = await figmaToNextJs(
        { variablesResponse: mockFigmaVariablesResponse },
        { darkMode: false }
      );

      expect(output.css).not.toContain('.dark {');
      expect(output.css).not.toContain('@media (prefers-color-scheme: dark)');
    });
  });

  test.describe('TypeScript Types Generation', () => {
    test('generates TypeScript type definitions', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTypes: true }
      );

      expect(output.types).toBeDefined();
      expect(output.types).toContain('export interface ThemeTokens');
    });

    test('generates ThemeVariableName type', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTypes: true }
      );

      expect(output.types).toContain('export type ThemeVariableName');
    });

    test('generates ThemeVar helper type', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTypes: true }
      );

      expect(output.types).toContain('export type ThemeVar');
    });

    test('can disable type generation', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTypes: false, generateConstants: false }
      );

      expect(output.types).toBeUndefined();
    });
  });

  test.describe('Constants Generation', () => {
    test('generates TypeScript constants', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateConstants: true }
      );

      expect(output.constants).toBeDefined();
      expect(output.constants).toContain('export const tokens');
    });

    test('generates cssVars lookup object', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateConstants: true }
      );

      expect(output.constants).toContain('export const cssVars');
    });

    test('generates cssVar helper function', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateConstants: true }
      );

      expect(output.constants).toContain('export function cssVar');
    });

    test('generates tokenMap', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateConstants: true }
      );

      expect(output.constants).toContain('export const tokenMap');
    });

    test('can disable constants generation', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTypes: false, generateConstants: false }
      );

      expect(output.constants).toBeUndefined();
    });
  });

  test.describe('Tailwind Config Generation', () => {
    test('generates Tailwind config file', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTailwindConfig: true }
      );

      expect(output.files['tailwind.config.ts']).toBeDefined();
    });

    test('generates themeExtend export', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTailwindConfig: true }
      );

      expect(output.files['tailwind.config.ts']).toContain('export const themeExtend');
    });

    test('includes color variables as CSS var references', async () => {
      const output = await figmaToNextJs(
        { variablesResponse: mockFigmaVariablesResponse },
        { generateTailwindConfig: true }
      );

      expect(output.files['tailwind.config.ts']).toContain('var(--');
    });

    test('can disable Tailwind config generation', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTailwindConfig: false }
      );

      expect(output.files['tailwind.config.ts']).toBeUndefined();
    });
  });

  test.describe('File Generation', () => {
    test('generates theme.css file', async () => {
      const output = await figmaToNextJs({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.files['theme.css']).toBeDefined();
      expect(output.files['theme.css']).toContain(':root');
    });

    test('generates theme.ts file with constants', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateConstants: true }
      );

      expect(output.files['theme.ts']).toBeDefined();
      expect(output.files['theme.ts']).toContain('export const');
    });

    test('generates theme.d.ts file with types', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { generateTypes: true }
      );

      expect(output.files['theme.d.ts']).toBeDefined();
      expect(output.files['theme.d.ts']).toContain('export interface');
    });
  });

  test.describe('Comments', () => {
    test('includes comments by default', async () => {
      const output = await figmaToNextJs({
        variableDefs: mockMCPVariableDefs,
      });

      expect(output.css).toContain('/**');
      expect(output.css).toContain('Design System Theme');
    });

    test('can disable comments', async () => {
      const output = await figmaToNextJs(
        { variableDefs: mockMCPVariableDefs },
        { format: { comments: false } }
      );

      expect(output.css).not.toContain('Design System Theme');
    });
  });

  test.describe('Token Type Handling', () => {
    test('formats dimension tokens with units', async () => {
      const output = await figmaToNextJs({
        variableDefs: mockMCPVariableDefs,
      });

      // Spacing tokens should have px unit
      expect(output.css).toMatch(/:\s*\d+px/);
    });

    test('formats color tokens correctly', async () => {
      const output = await figmaToNextJs({
        variableDefs: mockMCPVariableDefs,
      });

      // Color tokens should be present
      expect(output.css).toMatch(/#[a-fA-F0-9]{6}/);
    });
  });

  test.describe('REST API Integration', () => {
    test('works with full Figma REST API response', async () => {
      const output = await figmaToNextJs({
        variablesResponse: mockFigmaVariablesResponse,
      });

      expect(output.css).toBeTruthy();
      expect(output.files['theme.css']).toBeTruthy();
    });

    test('generates all expected files from REST API data', async () => {
      const output = await figmaToNextJs(
        { variablesResponse: mockFigmaVariablesResponse },
        {
          generateTypes: true,
          generateConstants: true,
          generateTailwindConfig: true,
        }
      );

      expect(output.files['theme.css']).toBeDefined();
      expect(output.files['theme.ts']).toBeDefined();
      expect(output.files['theme.d.ts']).toBeDefined();
      expect(output.files['tailwind.config.ts']).toBeDefined();
    });
  });

  test.describe('Adapter Metadata', () => {
    test('has correct id', async () => {
      const adapter = createNextJsAdapter();
      expect(adapter.id).toBe('nextjs');
    });

    test('has correct name', async () => {
      const adapter = createNextJsAdapter();
      expect(adapter.name).toBe('Next.js Adapter');
    });
  });
});
