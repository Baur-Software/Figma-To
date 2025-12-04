/**
 * Next.js Output Adapter
 *
 * Transforms normalized design tokens into Next.js-compatible CSS and configuration.
 * Generates CSS files optimized for Next.js App Router and Pages Router,
 * with optional TypeScript type definitions for theme tokens.
 */

import type {
  ThemeFile,
  OutputAdapter,
  OutputAdapterOptions,
} from '../../../schema/tokens.js';
import {
  generateNextJsCss,
  type NextJsGeneratorOptions,
} from './generator.js';
import {
  generateTypeScript,
  type TypeScriptGeneratorOptions,
} from './typescript-generator.js';

// =============================================================================
// Output Types
// =============================================================================

/**
 * Next.js output structure
 */
export interface NextJsOutput {
  /** Main CSS with all theme variables */
  css: string;
  /** Dark mode CSS (if applicable) */
  darkCss?: string;
  /** TypeScript type definitions for tokens */
  types?: string;
  /** JavaScript constants for tokens */
  constants?: string;
  /** Separate files map for outputting to different files */
  files: {
    'theme.css': string;
    'theme-dark.css'?: string;
    'theme.d.ts'?: string;
    'theme.ts'?: string;
    'tailwind.config.ts'?: string;
  };
  /** Tailwind config object (for programmatic use) */
  tailwindConfig?: NextJsTailwindConfig;
}

/**
 * Tailwind config additions for Next.js
 */
export interface NextJsTailwindConfig {
  theme: {
    extend: {
      colors?: Record<string, string | Record<string, string>>;
      spacing?: Record<string, string>;
      fontSize?: Record<string, string>;
      fontFamily?: Record<string, string[]>;
      borderRadius?: Record<string, string>;
      boxShadow?: Record<string, string>;
    };
  };
}

// =============================================================================
// Adapter Options
// =============================================================================

export interface NextJsAdapterOptions extends OutputAdapterOptions {
  /** Next.js router type (affects import paths) */
  router?: 'app' | 'pages';
  /** Generate TypeScript types for tokens */
  generateTypes?: boolean;
  /** Generate JavaScript/TypeScript constants */
  generateConstants?: boolean;
  /** Generate Tailwind config additions */
  generateTailwindConfig?: boolean;
  /** Color output format */
  colorFormat?: 'hex' | 'rgb' | 'hsl' | 'oklch';
  /** CSS variable prefix (default: '') */
  cssPrefix?: string;
  /** Use CSS Modules conventions */
  cssModules?: boolean;
  /** Include dark mode support */
  darkMode?: boolean;
  /** Dark mode strategy */
  darkModeStrategy?: 'media' | 'class' | 'selector';
  /** Generator-specific options */
  generator?: Partial<NextJsGeneratorOptions>;
  /** TypeScript generator options */
  typescript?: Partial<TypeScriptGeneratorOptions>;
}

// =============================================================================
// Adapter Implementation
// =============================================================================

/**
 * Next.js Output Adapter
 *
 * Generates CSS and configuration compatible with:
 * - Next.js App Router (app/)
 * - Next.js Pages Router (pages/)
 * - Tailwind CSS v4 integration
 * - CSS Modules
 */
export class NextJsAdapter implements OutputAdapter<NextJsOutput> {
  readonly id = 'nextjs';
  readonly name = 'Next.js Adapter';

  /**
   * Transform normalized theme to Next.js output
   */
  async transform(
    theme: ThemeFile,
    options: NextJsAdapterOptions = {}
  ): Promise<NextJsOutput> {
    const {
      mode,
      format = {},
      // router option reserved for future App Router vs Pages Router path customization
      router: _router = 'app',
      generateTypes = true,
      generateConstants = true,
      generateTailwindConfig = true,
      colorFormat = 'hex',
      cssPrefix = '',
      darkMode = true,
      darkModeStrategy = 'class',
      generator: generatorOptions = {},
      typescript: typescriptOptions = {},
    } = options;
    void _router;

    const includeComments = format.comments !== false;

    // Generate main CSS
    const cssOutput = generateNextJsCss(theme, {
      mode,
      includeComments,
      colorFormat,
      cssPrefix,
      darkMode,
      darkModeStrategy,
      ...generatorOptions,
    });

    // Generate TypeScript types if requested
    let typesOutput: string | undefined;
    let constantsOutput: string | undefined;
    if (generateTypes || generateConstants) {
      const tsOutput = generateTypeScript(theme, {
        mode,
        generateTypes,
        generateConstants,
        includeComments,
        ...typescriptOptions,
      });
      typesOutput = tsOutput.types;
      constantsOutput = tsOutput.constants;
    }

    // Generate Tailwind config additions if requested
    let tailwindConfig: NextJsTailwindConfig | undefined;
    let tailwindConfigTs: string | undefined;
    if (generateTailwindConfig) {
      const configResult = this.generateTailwindConfig(theme, {
        mode,
        cssPrefix,
        colorFormat,
      });
      tailwindConfig = configResult.config;
      tailwindConfigTs = configResult.typescript;
    }

    // Build files map
    const files: NextJsOutput['files'] = {
      'theme.css': cssOutput.css,
    };

    if (cssOutput.darkCss) {
      files['theme-dark.css'] = cssOutput.darkCss;
    }

    if (typesOutput) {
      files['theme.d.ts'] = typesOutput;
    }

    if (constantsOutput) {
      files['theme.ts'] = constantsOutput;
    }

    if (tailwindConfigTs) {
      files['tailwind.config.ts'] = tailwindConfigTs;
    }

    return {
      css: cssOutput.css,
      darkCss: cssOutput.darkCss,
      types: typesOutput,
      constants: constantsOutput,
      files,
      tailwindConfig,
    };
  }

  /**
   * Generate Tailwind config additions
   */
  private generateTailwindConfig(
    theme: ThemeFile,
    options: {
      mode?: string;
      cssPrefix: string;
      colorFormat: string;
    }
  ): { config: NextJsTailwindConfig; typescript: string } {
    const { mode, cssPrefix } = options;

    const colors: Record<string, string | Record<string, string>> = {};
    const spacing: Record<string, string> = {};
    const fontSize: Record<string, string> = {};
    const fontFamily: Record<string, string[]> = {};
    const borderRadius: Record<string, string> = {};
    const boxShadow: Record<string, string> = {};

    // Process collections
    for (const collection of theme.collections) {
      const selectedMode = mode || collection.defaultMode;
      const tokens = collection.tokens[selectedMode];

      if (!tokens) continue;

      this.extractTokensForTailwind(tokens, [], {
        cssPrefix,
        colors,
        spacing,
        fontSize,
        fontFamily,
        borderRadius,
        boxShadow,
      });
    }

    const config: NextJsTailwindConfig = {
      theme: {
        extend: {},
      },
    };

    // Only add non-empty categories
    if (Object.keys(colors).length > 0) {
      config.theme.extend.colors = colors;
    }
    if (Object.keys(spacing).length > 0) {
      config.theme.extend.spacing = spacing;
    }
    if (Object.keys(fontSize).length > 0) {
      config.theme.extend.fontSize = fontSize;
    }
    if (Object.keys(fontFamily).length > 0) {
      config.theme.extend.fontFamily = fontFamily;
    }
    if (Object.keys(borderRadius).length > 0) {
      config.theme.extend.borderRadius = borderRadius;
    }
    if (Object.keys(boxShadow).length > 0) {
      config.theme.extend.boxShadow = boxShadow;
    }

    // Generate TypeScript config file
    const typescript = this.generateTailwindConfigTs(config);

    return { config, typescript };
  }

  /**
   * Extract tokens for Tailwind config
   */
  private extractTokensForTailwind(
    group: Record<string, unknown>,
    path: string[],
    context: {
      cssPrefix: string;
      colors: Record<string, string | Record<string, string>>;
      spacing: Record<string, string>;
      fontSize: Record<string, string>;
      fontFamily: Record<string, string[]>;
      borderRadius: Record<string, string>;
      boxShadow: Record<string, string>;
    }
  ): void {
    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('$')) continue;

      if (this.isToken(value)) {
        const fullPath = [...path, key];
        const varName = this.pathToVarName(fullPath, context.cssPrefix);
        const tokenName = this.pathToTokenName(fullPath);

        switch (value.$type) {
          case 'color':
            this.setNestedColor(context.colors, fullPath, `var(--${varName})`);
            break;
          case 'dimension':
            if (path.some(p => p.toLowerCase().includes('spacing') || p.toLowerCase().includes('space'))) {
              context.spacing[tokenName] = `var(--${varName})`;
            } else if (path.some(p => p.toLowerCase().includes('radius'))) {
              context.borderRadius[tokenName] = `var(--${varName})`;
            } else if (path.some(p => p.toLowerCase().includes('font') && p.toLowerCase().includes('size'))) {
              context.fontSize[tokenName] = `var(--${varName})`;
            }
            break;
          case 'fontFamily':
            if (Array.isArray(value.$value)) {
              context.fontFamily[tokenName] = [`var(--${varName})`];
            }
            break;
          case 'shadow':
            context.boxShadow[tokenName] = `var(--${varName})`;
            break;
        }
      } else if (typeof value === 'object' && value !== null) {
        this.extractTokensForTailwind(
          value as Record<string, unknown>,
          [...path, key],
          context
        );
      }
    }
  }

  /**
   * Set a nested color in the colors object
   */
  private setNestedColor(
    colors: Record<string, string | Record<string, string>>,
    path: string[],
    value: string
  ): void {
    if (path.length === 1) {
      colors[path[0]] = value;
    } else if (path.length === 2) {
      const [group, name] = path;
      if (!colors[group] || typeof colors[group] === 'string') {
        colors[group] = {};
      }
      (colors[group] as Record<string, string>)[name] = value;
    } else {
      // Flatten deeper paths
      const name = path.join('-');
      colors[name] = value;
    }
  }

  /**
   * Convert path to CSS variable name
   */
  private pathToVarName(path: string[], prefix: string): string {
    const name = path.join('-').toLowerCase().replace(/\s+/g, '-');
    return prefix ? `${prefix}-${name}` : name;
  }

  /**
   * Convert path to token name for Tailwind config
   */
  private pathToTokenName(path: string[]): string {
    // Skip common prefixes
    const skipPrefixes = ['colors', 'color', 'spacing', 'space', 'radius', 'font', 'shadow'];
    let cleanPath = path;

    if (skipPrefixes.includes(path[0]?.toLowerCase())) {
      cleanPath = path.slice(1);
    }

    return cleanPath.join('-').toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Check if value is a token
   */
  private isToken(value: unknown): value is { $type: string; $value: unknown } {
    return (
      typeof value === 'object' &&
      value !== null &&
      '$type' in value &&
      '$value' in value
    );
  }

  /**
   * Generate Tailwind config TypeScript file
   */
  private generateTailwindConfigTs(config: NextJsTailwindConfig): string {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Tailwind CSS Theme Configuration');
    lines.push(' * Generated from Figma design tokens');
    lines.push(' *');
    lines.push(' * Usage: Import and spread into your tailwind.config.ts');
    lines.push(' *');
    lines.push(' * @example');
    lines.push(' * ```typescript');
    lines.push(' * import { themeExtend } from "./theme/tailwind.config";');
    lines.push(' *');
    lines.push(' * export default {');
    lines.push(' *   theme: {');
    lines.push(' *     extend: {');
    lines.push(' *       ...themeExtend,');
    lines.push(' *     },');
    lines.push(' *   },');
    lines.push(' * };');
    lines.push(' * ```');
    lines.push(' */');
    lines.push('');
    lines.push('export const themeExtend = ' + JSON.stringify(config.theme.extend, null, 2) + ' as const;');
    lines.push('');
    lines.push('export default {');
    lines.push('  theme: {');
    lines.push('    extend: themeExtend,');
    lines.push('  },');
    lines.push('};');
    lines.push('');

    return lines.join('\n');
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Next.js adapter instance
 */
export function createNextJsAdapter(): NextJsAdapter {
  return new NextJsAdapter();
}
