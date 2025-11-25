/**
 * Value Converters
 *
 * Convert normalized token values to CSS-compatible strings
 * for Tailwind and Ionic output.
 */

import type {
  ColorValue,
  DimensionValue,
  FontWeightValue,
  DurationValue,
  CubicBezierValue,
  ShadowValue,
  BorderValue,
  GradientValue,
  TransitionValue,
  Token,
  TokenType,
  TokenReference,
} from '../../schema/tokens.js';
import { isTokenReference } from '../../schema/tokens.js';

// =============================================================================
// Color Converters
// =============================================================================

/**
 * Convert ColorValue to CSS hex string
 */
export function colorToHex(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    const a = Math.round(color.a * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  }

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert ColorValue to CSS rgb/rgba string
 */
export function colorToRgb(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert ColorValue to RGB triplet (for Ionic --ion-color-*-rgb variables)
 */
export function colorToRgbTriplet(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `${r}, ${g}, ${b}`;
}

/**
 * Convert ColorValue to CSS oklch string
 */
export function colorToOklch(color: ColorValue): string {
  // Convert sRGB to linear RGB
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const lr = toLinear(color.r);
  const lg = toLinear(color.g);
  const lb = toLinear(color.b);

  // Linear RGB to XYZ
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  // XYZ to LMS
  const l = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z;
  const m = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z;
  const s = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z;

  // LMS to Oklab
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Oklab to Oklch
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  const lightness = (L * 100).toFixed(2);
  const chroma = C.toFixed(4);
  const hue = H.toFixed(2);

  if (color.a < 1) {
    return `oklch(${lightness}% ${chroma} ${hue} / ${color.a.toFixed(2)})`;
  }

  return `oklch(${lightness}% ${chroma} ${hue})`;
}

// =============================================================================
// Dimension Converters
// =============================================================================

/**
 * Convert DimensionValue to CSS string
 */
export function dimensionToCss(dim: DimensionValue): string {
  return `${dim.value}${dim.unit}`;
}

/**
 * Convert pixel dimension to rem
 */
export function pxToRem(px: number, baseFontSize: number = 16): string {
  return `${px / baseFontSize}rem`;
}

// =============================================================================
// Typography Converters
// =============================================================================

/**
 * Convert FontWeightValue to CSS string
 */
export function fontWeightToCss(weight: FontWeightValue): string {
  if (typeof weight === 'number') {
    return weight.toString();
  }

  const weightMap: Record<string, string> = {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  };

  return weightMap[weight] || '400';
}

/**
 * Convert font family array to CSS string
 */
export function fontFamilyToCss(families: string[]): string {
  return families
    .map(f => (f.includes(' ') ? `"${f}"` : f))
    .join(', ');
}

// =============================================================================
// Duration and Timing Converters
// =============================================================================

/**
 * Convert DurationValue to CSS string
 */
export function durationToCss(duration: DurationValue): string {
  return `${duration.value}${duration.unit}`;
}

/**
 * Convert CubicBezierValue to CSS string
 */
export function cubicBezierToCss(bezier: CubicBezierValue): string {
  return `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`;
}

// =============================================================================
// Shadow Converters
// =============================================================================

/**
 * Convert ShadowValue to CSS string
 */
export function shadowToCss(shadow: ShadowValue): string {
  const parts: string[] = [];

  if (shadow.inset) {
    parts.push('inset');
  }

  parts.push(dimensionToCss(shadow.offsetX));
  parts.push(dimensionToCss(shadow.offsetY));
  parts.push(dimensionToCss(shadow.blur));

  if (shadow.spread) {
    parts.push(dimensionToCss(shadow.spread));
  }

  parts.push(colorToRgb(shadow.color));

  return parts.join(' ');
}

/**
 * Convert array of shadows to CSS string
 */
export function shadowsToCss(shadows: ShadowValue | ShadowValue[]): string {
  if (Array.isArray(shadows)) {
    return shadows.map(shadowToCss).join(', ');
  }
  return shadowToCss(shadows);
}

// =============================================================================
// Border Converters
// =============================================================================

/**
 * Convert BorderValue to CSS string
 */
export function borderToCss(border: BorderValue): string {
  return `${dimensionToCss(border.width)} ${border.style} ${colorToRgb(border.color)}`;
}

// =============================================================================
// Gradient Converters
// =============================================================================

/**
 * Convert GradientValue to CSS string
 */
export function gradientToCss(gradient: GradientValue): string {
  const stops = gradient.stops
    .map(stop => `${colorToRgb(stop.color)} ${(stop.position * 100).toFixed(1)}%`)
    .join(', ');

  switch (gradient.type) {
    case 'linear':
      return `linear-gradient(${gradient.angle || 0}deg, ${stops})`;
    case 'radial':
      return `radial-gradient(${stops})`;
    case 'conic':
      return `conic-gradient(${stops})`;
    default:
      return `linear-gradient(${stops})`;
  }
}

// =============================================================================
// Transition Converters
// =============================================================================

/**
 * Convert TransitionValue to CSS string
 */
export function transitionToCss(transition: TransitionValue): string {
  const timing = typeof transition.timingFunction === 'string'
    ? transition.timingFunction
    : cubicBezierToCss(transition.timingFunction);

  const parts = [durationToCss(transition.duration), timing];

  if (transition.delay) {
    parts.push(durationToCss(transition.delay));
  }

  return parts.join(' ');
}

// =============================================================================
// Generic Token Value Converter
// =============================================================================

/**
 * Convert a token reference to CSS var() syntax
 */
export function referenceToVar(ref: TokenReference, prefix: string = ''): string {
  // Convert reference path to CSS variable name
  // e.g., "{colors.primary.500}" -> "var(--colors-primary-500)"
  const path = ref.$ref
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .replace(/\./g, '-');

  return `var(--${prefix}${path})`;
}

/**
 * Convert any token value to CSS string
 */
export function tokenValueToCss(
  token: Token<TokenType>,
  options: { prefix?: string; colorFormat?: 'hex' | 'rgb' | 'oklch' } = {}
): string {
  const { prefix = '', colorFormat = 'hex' } = options;

  // Handle references
  if (isTokenReference(token.$value)) {
    return referenceToVar(token.$value, prefix);
  }

  const value = token.$value;

  switch (token.$type) {
    case 'color': {
      const color = value as ColorValue;
      switch (colorFormat) {
        case 'rgb':
          return colorToRgb(color);
        case 'oklch':
          return colorToOklch(color);
        default:
          return colorToHex(color);
      }
    }

    case 'dimension':
      return dimensionToCss(value as DimensionValue);

    case 'fontFamily':
      return fontFamilyToCss(value as string[]);

    case 'fontWeight':
      return fontWeightToCss(value as FontWeightValue);

    case 'duration':
      return durationToCss(value as DurationValue);

    case 'cubicBezier':
      return cubicBezierToCss(value as CubicBezierValue);

    case 'shadow':
      return shadowsToCss(value as ShadowValue | ShadowValue[]);

    case 'border':
      return borderToCss(value as BorderValue);

    case 'gradient':
      return gradientToCss(value as GradientValue);

    case 'transition':
      return transitionToCss(value as TransitionValue);

    case 'number':
      return (value as number).toString();

    case 'string':
      return value as string;

    case 'boolean':
      return (value as boolean).toString();

    default:
      return String(value);
  }
}
