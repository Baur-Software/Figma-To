/**
 * Next.js CSS Generator
 *
 * Generates CSS variables and styles optimized for Next.js projects.
 * Supports both App Router and Pages Router conventions.
 */

import type {
  ThemeFile,
  Token,
  TokenGroup,
  ColorValue,
  DimensionValue,
  ShadowValue,
  TypographyValue,
} from '../../../schema/tokens.js';
import { isTokenReference } from '../../../schema/tokens.js';

// =============================================================================
// Types
// =============================================================================

export interface NextJsGeneratorOptions {
  /** Mode to use for token values */
  mode?: string;
  /** Include comments in output */
  includeComments?: boolean;
  /** Color format for output */
  colorFormat?: 'hex' | 'rgb' | 'hsl' | 'oklch';
  /** CSS variable prefix */
  cssPrefix?: string;
  /** Include dark mode support */
  darkMode?: boolean;
  /** Dark mode strategy */
  darkModeStrategy?: 'media' | 'class' | 'selector';
  /** Dark mode class name (when using 'class' strategy) */
  darkModeClass?: string;
}

export interface NextJsCssOutput {
  /** Main CSS content */
  css: string;
  /** Dark mode CSS (separate file if using class/selector strategy) */
  darkCss?: string;
  /** Variables extracted for programmatic use */
  variables: CssVariable[];
}

export interface CssVariable {
  name: string;
  value: string;
  type: string;
  path: string[];
  comment?: string;
}

// =============================================================================
// Color Conversion Utilities
// =============================================================================

function colorToHex(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    const a = Math.round(color.a * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  }

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function colorToRgba(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function colorToHsl(color: ColorValue): string {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  if (color.a < 1) {
    return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${color.a.toFixed(2)})`;
  }
  return `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`;
}

function colorToOklch(color: ColorValue): string {
  // Convert RGB to linear RGB
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const lr = toLinear(color.r);
  const lg = toLinear(color.g);
  const lb = toLinear(color.b);

  // Convert linear RGB to XYZ
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  // Convert XYZ to Oklab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Convert to LCH
  const C = Math.sqrt(a * a + b_ * b_);
  let H = Math.atan2(b_, a) * 180 / Math.PI;
  if (H < 0) H += 360;

  const lPercent = (L * 100).toFixed(2);
  const chroma = C.toFixed(4);
  const hue = H.toFixed(2);

  if (color.a < 1) {
    return `oklch(${lPercent}% ${chroma} ${hue} / ${color.a.toFixed(2)})`;
  }
  return `oklch(${lPercent}% ${chroma} ${hue})`;
}

function formatColor(color: ColorValue, format: 'hex' | 'rgb' | 'hsl' | 'oklch'): string {
  switch (format) {
    case 'rgb':
      return colorToRgba(color);
    case 'hsl':
      return colorToHsl(color);
    case 'oklch':
      return colorToOklch(color);
    case 'hex':
    default:
      return colorToHex(color);
  }
}

function formatDimension(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

function formatShadow(shadow: ShadowValue, colorFormat: 'hex' | 'rgb' | 'hsl' | 'oklch'): string {
  const parts: string[] = [];
  if (shadow.inset) {
    parts.push('inset');
  }
  parts.push(formatDimension(shadow.offsetX));
  parts.push(formatDimension(shadow.offsetY));
  parts.push(formatDimension(shadow.blur));
  if (shadow.spread) {
    parts.push(formatDimension(shadow.spread));
  }
  parts.push(formatColor(shadow.color, colorFormat));
  return parts.join(' ');
}

// =============================================================================
// Token Processing
// =============================================================================

interface FlattenedToken {
  path: string[];
  token: Token;
}

function flattenTokenGroup(
  group: TokenGroup,
  path: string[] = []
): FlattenedToken[] {
  const result: FlattenedToken[] = [];

  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('$')) continue;

    if (isToken(value)) {
      result.push({ path: [...path, key], token: value });
    } else if (isTokenGroup(value)) {
      result.push(...flattenTokenGroup(value, [...path, key]));
    }
  }

  return result;
}

function isToken(value: unknown): value is Token {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$type' in value &&
    '$value' in value
  );
}

function isTokenGroup(value: unknown): value is TokenGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    !('$type' in value && '$value' in value)
  );
}

function pathToVariableName(path: string[], prefix: string): string {
  const name = path.join('-').toLowerCase().replace(/\s+/g, '-');
  return prefix ? `${prefix}-${name}` : name;
}

function formatTokenValue(
  token: Token,
  colorFormat: 'hex' | 'rgb' | 'hsl' | 'oklch'
): string {
  const value = token.$value;

  if (isTokenReference(value)) {
    const refPath = value.$ref.replace(/\./g, '-').toLowerCase();
    return `var(--${refPath})`;
  }

  switch (token.$type) {
    case 'color':
      return formatColor(value as ColorValue, colorFormat);

    case 'dimension':
      return formatDimension(value as DimensionValue);

    case 'fontFamily': {
      const fonts: string[] = Array.isArray(value) ? value as string[] : [String(value)];
      return fonts.map(f => f.includes(' ') ? `"${f}"` : f).join(', ');
    }

    case 'fontWeight':
      return String(value);

    case 'typography': {
      const typo = value as TypographyValue;
      // Return just the font shorthand for typography tokens
      const family = typo.fontFamily.map(f => f.includes(' ') ? `"${f}"` : f).join(', ');
      const lineHeight = typeof typo.lineHeight === 'number'
        ? typo.lineHeight
        : formatDimension(typo.lineHeight);
      return `${typo.fontWeight} ${formatDimension(typo.fontSize)}/${lineHeight} ${family}`;
    }

    case 'shadow': {
      if (Array.isArray(value)) {
        return (value as ShadowValue[]).map(s => formatShadow(s, colorFormat)).join(', ');
      }
      return formatShadow(value as ShadowValue, colorFormat);
    }

    case 'number':
      return String(value);

    case 'duration':
      return `${(value as { value: number; unit: string }).value}${(value as { value: number; unit: string }).unit}`;

    case 'string':
    default:
      return typeof value === 'string' && value.includes(' ')
        ? `"${value}"`
        : String(value);
  }
}

// =============================================================================
// CSS Generation
// =============================================================================

/**
 * Generate Next.js-compatible CSS from design tokens
 */
export function generateNextJsCss(
  theme: ThemeFile,
  options: NextJsGeneratorOptions = {}
): NextJsCssOutput {
  const {
    mode,
    includeComments = true,
    colorFormat = 'hex',
    cssPrefix = '',
    darkMode = true,
    darkModeStrategy = 'class',
    darkModeClass = 'dark',
  } = options;

  const variables: CssVariable[] = [];
  const lightVariables: string[] = [];
  const darkVariables: string[] = [];

  // Process all collections
  for (const collection of theme.collections) {
    const selectedMode = mode || collection.defaultMode;
    const tokens = collection.tokens[selectedMode];

    if (!tokens) continue;

    const flattened = flattenTokenGroup(tokens);

    for (const { path, token } of flattened) {
      if (isTokenReference(token.$value)) continue;

      const varName = pathToVariableName(path, cssPrefix);
      const value = formatTokenValue(token, colorFormat);

      const variable: CssVariable = {
        name: varName,
        value,
        type: token.$type,
        path,
        comment: token.$description,
      };

      variables.push(variable);

      const line = includeComments && token.$description
        ? `  /* ${token.$description} */\n  --${varName}: ${value};`
        : `  --${varName}: ${value};`;

      lightVariables.push(line);
    }

    // Process dark mode tokens if available
    if (darkMode) {
      const darkTokens = collection.tokens['dark'] ||
        collection.tokens['Dark'] ||
        Object.entries(collection.tokens).find(([k]) =>
          k.toLowerCase().includes('dark')
        )?.[1];

      if (darkTokens) {
        const flattenedDark = flattenTokenGroup(darkTokens);

        for (const { path, token } of flattenedDark) {
          if (isTokenReference(token.$value)) continue;

          const varName = pathToVariableName(path, cssPrefix);
          const value = formatTokenValue(token, colorFormat);

          const line = `  --${varName}: ${value};`;
          darkVariables.push(line);
        }
      }
    }
  }

  // Build CSS output
  const cssLines: string[] = [];

  // Header
  if (includeComments) {
    cssLines.push('/**');
    cssLines.push(' * Design System Theme');
    cssLines.push(` * Generated from: ${theme.name}`);
    cssLines.push(` * Generated: ${new Date().toISOString()}`);
    cssLines.push(' *');
    cssLines.push(' * This file contains CSS custom properties for your design tokens.');
    cssLines.push(' * Import this file in your global CSS or layout.');
    cssLines.push(' */');
    cssLines.push('');
  }

  // Light mode variables
  cssLines.push(':root {');
  cssLines.push(...lightVariables);
  cssLines.push('}');

  // Dark mode handling
  let darkCss: string | undefined;

  if (darkMode && darkVariables.length > 0) {
    cssLines.push('');

    switch (darkModeStrategy) {
      case 'media':
        cssLines.push('@media (prefers-color-scheme: dark) {');
        cssLines.push('  :root {');
        cssLines.push(...darkVariables.map(v => `  ${v}`));
        cssLines.push('  }');
        cssLines.push('}');
        break;

      case 'class':
        cssLines.push(`.${darkModeClass} {`);
        cssLines.push(...darkVariables);
        cssLines.push('}');
        break;

      case 'selector':
        cssLines.push('[data-theme="dark"] {');
        cssLines.push(...darkVariables);
        cssLines.push('}');
        break;
    }

    // Also generate separate dark CSS file
    const darkCssLines: string[] = [];
    if (includeComments) {
      darkCssLines.push('/**');
      darkCssLines.push(' * Design System Theme - Dark Mode');
      darkCssLines.push(` * Generated from: ${theme.name}`);
      darkCssLines.push(' */');
      darkCssLines.push('');
    }
    darkCssLines.push(':root {');
    darkCssLines.push(...darkVariables);
    darkCssLines.push('}');

    darkCss = darkCssLines.join('\n');
  }

  return {
    css: cssLines.join('\n'),
    darkCss,
    variables,
  };
}
