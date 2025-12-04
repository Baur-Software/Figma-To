/**
 * Next.js Configuration Wrapper
 *
 * Provides a wrapper function for next.config.js that enables
 * build-time theme generation from Figma design tokens.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { ThemeFile } from '../../../schema/tokens.js';
import { createFigmaAdapter } from '../../input/figma/index.js';
import { createNextJsAdapter, type NextJsAdapterOptions } from './adapter.js';
import type { GetLocalVariablesResponse } from '@figma/rest-api-spec';

// =============================================================================
// Types
// =============================================================================

export interface FigmaToNextJsOptions {
  /**
   * Figma file key (required unless using prebuilt theme)
   */
  figmaFileKey?: string;

  /**
   * Figma API token (required unless using prebuilt theme)
   * Can also be set via FIGMA_TOKEN environment variable
   */
  figmaToken?: string;

  /**
   * Pre-built theme (skip Figma API call)
   */
  theme?: ThemeFile;

  /**
   * Pre-fetched Figma variables response
   */
  variablesResponse?: GetLocalVariablesResponse;

  /**
   * Output directory for generated theme files
   * @default './src/theme'
   */
  outputDir?: string;

  /**
   * Generate files during build
   * Set to false to only generate during development
   * @default true
   */
  generateOnBuild?: boolean;

  /**
   * Enable file watching during development
   * @default true
   */
  watch?: boolean;

  /**
   * Adapter options for CSS generation
   */
  adapterOptions?: NextJsAdapterOptions;

  /**
   * Callback when theme is generated
   */
  onGenerate?: (output: GeneratedThemeOutput) => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export interface GeneratedThemeOutput {
  /** Generated CSS content */
  css: string;
  /** Generated dark mode CSS */
  darkCss?: string;
  /** Generated TypeScript types */
  types?: string;
  /** Generated constants */
  constants?: string;
  /** Generated Tailwind config */
  tailwindConfig?: string;
  /** Files that were written */
  files: string[];
}

export interface NextConfigWithFigmaTo {
  /** Standard Next.js config properties */
  [key: string]: unknown;
  /** Internal: Figma theme options */
  _figmaToOptions?: FigmaToNextJsOptions;
}

// =============================================================================
// Theme Generation
// =============================================================================

/**
 * Generate theme files from Figma tokens
 */
async function generateThemeFiles(
  options: FigmaToNextJsOptions
): Promise<GeneratedThemeOutput> {
  const {
    figmaFileKey,
    figmaToken,
    theme: prebuiltTheme,
    variablesResponse,
    outputDir = './src/theme',
    adapterOptions = {},
  } = options;

  let theme: ThemeFile;

  // Get theme from source
  if (prebuiltTheme) {
    theme = prebuiltTheme;
  } else if (variablesResponse && figmaFileKey) {
    const figmaAdapter = createFigmaAdapter();
    theme = await figmaAdapter.parse({ variablesResponse, fileKey: figmaFileKey });
  } else if (figmaFileKey) {
    const token = figmaToken || process.env.FIGMA_TOKEN;
    if (!token) {
      throw new Error(
        'Figma API token required. Set figmaToken option or FIGMA_TOKEN environment variable.'
      );
    }

    // Fetch from Figma API
    const response = await fetch(
      `https://api.figma.com/v1/files/${figmaFileKey}/variables/local`,
      { headers: { 'X-Figma-Token': token } }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Figma API error: ${response.status} ${response.statusText}\n${text}`);
    }

    const vars = await response.json() as GetLocalVariablesResponse;
    const figmaAdapter = createFigmaAdapter();
    theme = await figmaAdapter.parse({ variablesResponse: vars, fileKey: figmaFileKey });
  } else {
    throw new Error(
      'Either figmaFileKey, theme, or variablesResponse is required.'
    );
  }

  // Generate output
  const nextAdapter = createNextJsAdapter();
  const output = await nextAdapter.transform(theme, adapterOptions);

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write files
  const writtenFiles: string[] = [];

  for (const [filename, content] of Object.entries(output.files)) {
    if (content) {
      const filepath = join(outputDir, filename);
      const dir = dirname(filepath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filepath, content);
      writtenFiles.push(filepath);
    }
  }

  return {
    css: output.css,
    darkCss: output.darkCss,
    types: output.types,
    constants: output.constants,
    tailwindConfig: output.files['tailwind.config.ts'],
    files: writtenFiles,
  };
}

// =============================================================================
// Next.js Config Wrapper
// =============================================================================

/**
 * Wrap Next.js config with Figma theme generation
 *
 * @example
 * ```typescript
 * // next.config.ts
 * import { withFigmaToTheme } from '@baur-software/figma-to/nextjs';
 *
 * const nextConfig = {
 *   // your config
 * };
 *
 * export default withFigmaToTheme(nextConfig, {
 *   figmaFileKey: 'your-file-key',
 *   figmaToken: process.env.FIGMA_TOKEN,
 *   outputDir: './src/theme',
 * });
 * ```
 */
export function withFigmaToTheme<T extends Record<string, unknown>>(
  nextConfig: T,
  options: FigmaToNextJsOptions
): T & NextConfigWithFigmaTo {
  const isDev = process.env.NODE_ENV === 'development';
  const shouldGenerate = options.generateOnBuild !== false || isDev;

  // Generate theme during config initialization
  if (shouldGenerate) {
    // Use IIFE to handle async in sync context
    (async () => {
      try {
        console.log('[figma-to] Generating theme from Figma tokens...');
        const output = await generateThemeFiles(options);
        console.log(`[figma-to] Generated ${output.files.length} theme files:`);
        for (const file of output.files) {
          console.log(`  - ${file}`);
        }
        options.onGenerate?.(output);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[figma-to] Error generating theme:', err.message);
        options.onError?.(err);
      }
    })();
  }

  return {
    ...nextConfig,
    _figmaToOptions: options,
  };
}

/**
 * Generate theme files programmatically
 *
 * Use this for custom build scripts or when you need more control
 * over when theme generation occurs.
 *
 * @example
 * ```typescript
 * // scripts/generate-theme.ts
 * import { generateTheme } from '@baur-software/figma-to/nextjs';
 *
 * await generateTheme({
 *   figmaFileKey: 'your-file-key',
 *   figmaToken: process.env.FIGMA_TOKEN,
 *   outputDir: './src/theme',
 * });
 * ```
 */
export async function generateTheme(
  options: FigmaToNextJsOptions
): Promise<GeneratedThemeOutput> {
  return generateThemeFiles(options);
}

/**
 * Sync theme from Figma (alias for generateTheme)
 */
export const syncTheme = generateTheme;
