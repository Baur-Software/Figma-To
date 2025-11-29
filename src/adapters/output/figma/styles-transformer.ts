/**
 * Styles Transformer
 *
 * Transforms composite token types (typography, shadow, gradient)
 * into Figma Styles format for Plugin API.
 */

import type {
  ThemeFile,
  Token,
  TokenGroup,
  TypographyValue,
  ShadowValue,
  GradientValue,
  ColorValue,
  DimensionValue,
} from '../../../schema/tokens.js';
import type {
  PluginTextStyleParams,
  PluginEffectStyleParams,
  PluginPaintStyleParams,
  FigmaTextStyle,
  FigmaEffectStyle,
  FigmaPaintStyle,
  FigmaEffect,
  FigmaPaint,
  FigmaGradientStop,
} from './types.js';
import { TransformationReportBuilder } from './report.js';

// =============================================================================
// Typography → Text Style
// =============================================================================

/**
 * Convert a typography token to Figma Text Style parameters
 */
export function typographyToTextStyle(
  name: string,
  value: TypographyValue,
  description?: string
): FigmaTextStyle {
  const style: FigmaTextStyle = {
    name,
    fontFamily: value.fontFamily[0] || 'Inter',
    fontSize: extractDimensionValue(value.fontSize),
    fontWeight: normalizeFontWeight(value.fontWeight),
  };

  if (description) {
    style.description = description;
  }

  // Line height
  if (typeof value.lineHeight === 'number') {
    // Percentage or unitless multiplier
    style.lineHeight = {
      unit: 'PERCENT',
      value: value.lineHeight * 100,
    };
  } else if (value.lineHeight) {
    style.lineHeight = {
      unit: 'PIXELS',
      value: extractDimensionValue(value.lineHeight),
    };
  }

  // Letter spacing
  if (value.letterSpacing) {
    style.letterSpacing = {
      unit: 'PIXELS',
      value: extractDimensionValue(value.letterSpacing),
    };
  }

  // Text transform → text case
  if (value.textTransform) {
    style.textCase = textTransformToTextCase(value.textTransform);
  }

  return style;
}

/**
 * Convert CSS text-transform to Figma text case
 */
function textTransformToTextCase(
  transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
): 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' {
  switch (transform) {
    case 'uppercase':
      return 'UPPER';
    case 'lowercase':
      return 'LOWER';
    case 'capitalize':
      return 'TITLE';
    default:
      return 'ORIGINAL';
  }
}

// =============================================================================
// Shadow → Effect Style
// =============================================================================

/**
 * Convert a shadow token to Figma Effect Style parameters
 */
export function shadowToEffectStyle(
  name: string,
  value: ShadowValue | ShadowValue[],
  description?: string
): FigmaEffectStyle {
  const shadows = Array.isArray(value) ? value : [value];

  const style: FigmaEffectStyle = {
    name,
    effects: shadows.map(shadowToFigmaEffect),
  };

  if (description) {
    style.description = description;
  }

  return style;
}

/**
 * Convert a single shadow value to Figma effect
 */
function shadowToFigmaEffect(shadow: ShadowValue): FigmaEffect {
  return {
    type: shadow.inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
    visible: true,
    blendMode: 'NORMAL',
    color: colorToFigmaRGBA(shadow.color),
    offset: {
      x: extractDimensionValue(shadow.offsetX),
      y: extractDimensionValue(shadow.offsetY),
    },
    radius: extractDimensionValue(shadow.blur),
    spread: shadow.spread ? extractDimensionValue(shadow.spread) : 0,
  };
}

// =============================================================================
// Gradient → Paint Style
// =============================================================================

/**
 * Convert a gradient token to Figma Paint Style parameters
 */
export function gradientToPaintStyle(
  name: string,
  value: GradientValue,
  description?: string
): FigmaPaintStyle {
  const style: FigmaPaintStyle = {
    name,
    paints: [gradientToFigmaPaint(value)],
  };

  if (description) {
    style.description = description;
  }

  return style;
}

/**
 * Convert a gradient value to Figma paint
 */
function gradientToFigmaPaint(gradient: GradientValue): FigmaPaint {
  const gradientStops: FigmaGradientStop[] = gradient.stops.map(stop => ({
    color: colorToFigmaRGBA(stop.color),
    position: stop.position,
  }));

  // Calculate gradient handles from angle (for linear gradients)
  const angle = gradient.angle ?? 180; // Default: top to bottom
  const radians = (angle - 90) * (Math.PI / 180);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Figma uses a transform matrix for gradients
  // For a simple linear gradient, we position handles at opposite edges
  const gradientHandlePositions: Array<{ x: number; y: number }> = [
    { x: 0.5 - cos * 0.5, y: 0.5 - sin * 0.5 }, // Start
    { x: 0.5 + cos * 0.5, y: 0.5 + sin * 0.5 }, // End
    { x: 0.5 - sin * 0.5, y: 0.5 + cos * 0.5 }, // Width handle (perpendicular)
  ];

  return {
    type: gradientTypeToFigma(gradient.type),
    visible: true,
    blendMode: 'NORMAL',
    gradientStops,
    gradientHandlePositions,
  };
}

/**
 * Convert gradient type to Figma gradient type
 */
function gradientTypeToFigma(
  type: 'linear' | 'radial' | 'conic'
): 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' {
  switch (type) {
    case 'linear':
      return 'GRADIENT_LINEAR';
    case 'radial':
      return 'GRADIENT_RADIAL';
    case 'conic':
      return 'GRADIENT_ANGULAR';
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract numeric value from a dimension
 */
function extractDimensionValue(dim: DimensionValue): number {
  return dim.value;
}

/**
 * Normalize font weight to numeric value
 */
function normalizeFontWeight(weight: number | string): number {
  if (typeof weight === 'number') {
    return weight;
  }

  const keywords: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900,
  };

  return keywords[weight.toLowerCase()] ?? 400;
}

/**
 * Convert color to Figma RGBA (0-1 range)
 */
function colorToFigmaRGBA(color: ColorValue): { r: number; g: number; b: number; a: number } {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
}

// =============================================================================
// Token Traversal
// =============================================================================

interface StyleTokenResult {
  textStyles: PluginTextStyleParams[];
  effectStyles: PluginEffectStyleParams[];
  paintStyles: PluginPaintStyleParams[];
}

/**
 * Extract style tokens from a ThemeFile
 */
export function extractStyleTokens(
  theme: ThemeFile,
  report: TransformationReportBuilder
): StyleTokenResult {
  const result: StyleTokenResult = {
    textStyles: [],
    effectStyles: [],
    paintStyles: [],
  };

  for (const collection of theme.collections) {
    const defaultTokens = collection.tokens[collection.defaultMode];
    if (!defaultTokens) continue;

    traverseForStyles(defaultTokens, [], collection.name, result, report);
  }

  return result;
}

/**
 * Traverse token group looking for style-compatible tokens
 */
function traverseForStyles(
  group: TokenGroup,
  path: string[],
  collectionName: string,
  result: StyleTokenResult,
  report: TransformationReportBuilder
): void {
  for (const [key, value] of Object.entries(group)) {
    if (value === undefined || typeof value === 'string' || key.startsWith('$')) {
      continue;
    }

    const currentPath = [...path, key];
    const styleName = currentPath.join('/');

    if ('$type' in value && typeof value.$type === 'string') {
      const token = value as Token;

      switch (token.$type) {
        case 'typography': {
          const textStyle = typographyToTextStyle(
            styleName,
            token.$value as TypographyValue,
            token.$description
          );
          result.textStyles.push({
            action: 'CREATE',
            style: textStyle,
          });
          report.addStyle('text');
          break;
        }

        case 'shadow': {
          const effectStyle = shadowToEffectStyle(
            styleName,
            token.$value as ShadowValue | ShadowValue[],
            token.$description
          );
          result.effectStyles.push({
            action: 'CREATE',
            style: effectStyle,
          });
          report.addStyle('effect');
          break;
        }

        case 'gradient': {
          const paintStyle = gradientToPaintStyle(
            styleName,
            token.$value as GradientValue,
            token.$description
          );
          result.paintStyles.push({
            action: 'CREATE',
            style: paintStyle,
          });
          report.addStyle('paint');
          break;
        }
      }
    } else {
      // Recurse into nested group
      traverseForStyles(
        value as TokenGroup,
        currentPath,
        collectionName,
        result,
        report
      );
    }
  }
}
