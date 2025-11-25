/**
 * Tailwind CSS v4 Theme Configuration Types
 *
 * Defines the structure for generating Tailwind CSS v4 theme
 * configurations from normalized design tokens.
 *
 * Reference: https://tailwindcss.com/docs/theme
 */

// =============================================================================
// Tailwind CSS v4 @theme Directive Types
// =============================================================================

/**
 * Tailwind v4 theme namespace prefixes
 * These are used in CSS variable names: --{namespace}-{key}
 */
export const TAILWIND_NAMESPACES = [
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'spacing',
  'width',
  'max-width',
  'height',
  'radius',
  'shadow',
  'inset-shadow',
  'drop-shadow',
  'blur',
  'opacity',
  'z-index',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'animate',
  'aspect-ratio',
  'container',
  'breakpoint',
] as const;

export type TailwindNamespace = typeof TAILWIND_NAMESPACES[number];

// =============================================================================
// Color Theme Types
// =============================================================================

/**
 * Tailwind color scale (50-950)
 */
export type TailwindColorStep =
  | '50' | '100' | '200' | '300' | '400'
  | '500' | '600' | '700' | '800' | '900' | '950';

/**
 * A color scale with all shades
 */
export type TailwindColorScale = {
  [K in TailwindColorStep]?: string;
} & {
  DEFAULT?: string;
};

/**
 * Tailwind color palette structure
 */
export interface TailwindColors {
  inherit?: string;
  current?: string;
  transparent?: string;
  black?: string;
  white?: string;
  [colorName: string]: string | TailwindColorScale | undefined;
}

// =============================================================================
// Typography Theme Types
// =============================================================================

/**
 * Font family configuration
 */
export interface TailwindFontFamily {
  [name: string]: string[];
}

/**
 * Font size configuration with optional line-height and letter-spacing
 */
export type TailwindFontSize = {
  [name: string]: string | [string, string] | [string, { lineHeight?: string; letterSpacing?: string }];
};

/**
 * Font weight configuration
 */
export interface TailwindFontWeight {
  thin?: string;
  extralight?: string;
  light?: string;
  normal?: string;
  medium?: string;
  semibold?: string;
  bold?: string;
  extrabold?: string;
  black?: string;
  [name: string]: string | undefined;
}

/**
 * Line height configuration
 */
export interface TailwindLineHeight {
  none?: string;
  tight?: string;
  snug?: string;
  normal?: string;
  relaxed?: string;
  loose?: string;
  [name: string]: string | undefined;
}

/**
 * Letter spacing configuration
 */
export interface TailwindLetterSpacing {
  tighter?: string;
  tight?: string;
  normal?: string;
  wide?: string;
  wider?: string;
  widest?: string;
  [name: string]: string | undefined;
}

// =============================================================================
// Spacing and Sizing Theme Types
// =============================================================================

/**
 * Spacing scale
 */
export interface TailwindSpacing {
  px?: string;
  '0'?: string;
  '0.5'?: string;
  '1'?: string;
  '1.5'?: string;
  '2'?: string;
  '2.5'?: string;
  '3'?: string;
  '3.5'?: string;
  '4'?: string;
  '5'?: string;
  '6'?: string;
  '7'?: string;
  '8'?: string;
  '9'?: string;
  '10'?: string;
  '11'?: string;
  '12'?: string;
  '14'?: string;
  '16'?: string;
  '20'?: string;
  '24'?: string;
  '28'?: string;
  '32'?: string;
  '36'?: string;
  '40'?: string;
  '44'?: string;
  '48'?: string;
  '52'?: string;
  '56'?: string;
  '60'?: string;
  '64'?: string;
  '72'?: string;
  '80'?: string;
  '96'?: string;
  [name: string]: string | undefined;
}

/**
 * Border radius configuration
 */
export interface TailwindBorderRadius {
  none?: string;
  sm?: string;
  DEFAULT?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
  '3xl'?: string;
  full?: string;
  [name: string]: string | undefined;
}

// =============================================================================
// Effects Theme Types
// =============================================================================

/**
 * Box shadow configuration
 */
export interface TailwindBoxShadow {
  sm?: string;
  DEFAULT?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
  inner?: string;
  none?: string;
  [name: string]: string | undefined;
}

/**
 * Drop shadow configuration (for filter: drop-shadow())
 */
export interface TailwindDropShadow {
  sm?: string | string[];
  DEFAULT?: string | string[];
  md?: string | string[];
  lg?: string | string[];
  xl?: string | string[];
  '2xl'?: string | string[];
  none?: string;
  [name: string]: string | string[] | undefined;
}

/**
 * Opacity configuration
 */
export interface TailwindOpacity {
  '0'?: string;
  '5'?: string;
  '10'?: string;
  '15'?: string;
  '20'?: string;
  '25'?: string;
  '30'?: string;
  '35'?: string;
  '40'?: string;
  '45'?: string;
  '50'?: string;
  '55'?: string;
  '60'?: string;
  '65'?: string;
  '70'?: string;
  '75'?: string;
  '80'?: string;
  '85'?: string;
  '90'?: string;
  '95'?: string;
  '100'?: string;
  [name: string]: string | undefined;
}

// =============================================================================
// Animation Theme Types
// =============================================================================

/**
 * Transition duration configuration
 */
export interface TailwindTransitionDuration {
  '0'?: string;
  '75'?: string;
  '100'?: string;
  '150'?: string;
  '200'?: string;
  '300'?: string;
  '500'?: string;
  '700'?: string;
  '1000'?: string;
  DEFAULT?: string;
  [name: string]: string | undefined;
}

/**
 * Transition timing function configuration
 */
export interface TailwindTransitionTimingFunction {
  DEFAULT?: string;
  linear?: string;
  in?: string;
  out?: string;
  'in-out'?: string;
  [name: string]: string | undefined;
}

/**
 * Animation keyframes
 */
export interface TailwindKeyframes {
  [name: string]: {
    [step: string]: Record<string, string>;
  };
}

/**
 * Animation configuration
 */
export interface TailwindAnimation {
  none?: string;
  spin?: string;
  ping?: string;
  pulse?: string;
  bounce?: string;
  [name: string]: string | undefined;
}

// =============================================================================
// Layout Theme Types
// =============================================================================

/**
 * Breakpoint configuration
 */
export interface TailwindBreakpoints {
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
  [name: string]: string | undefined;
}

/**
 * Z-index configuration
 */
export interface TailwindZIndex {
  auto?: string;
  '0'?: string;
  '10'?: string;
  '20'?: string;
  '30'?: string;
  '40'?: string;
  '50'?: string;
  [name: string]: string | undefined;
}

// =============================================================================
// Complete Theme Configuration
// =============================================================================

/**
 * Complete Tailwind CSS v4 theme configuration
 */
export interface TailwindTheme {
  colors?: TailwindColors;
  fontFamily?: TailwindFontFamily;
  fontSize?: TailwindFontSize;
  fontWeight?: TailwindFontWeight;
  lineHeight?: TailwindLineHeight;
  letterSpacing?: TailwindLetterSpacing;
  spacing?: TailwindSpacing;
  borderRadius?: TailwindBorderRadius;
  boxShadow?: TailwindBoxShadow;
  dropShadow?: TailwindDropShadow;
  opacity?: TailwindOpacity;
  transitionDuration?: TailwindTransitionDuration;
  transitionTimingFunction?: TailwindTransitionTimingFunction;
  animation?: TailwindAnimation;
  keyframes?: TailwindKeyframes;
  screens?: TailwindBreakpoints;
  zIndex?: TailwindZIndex;
}

// =============================================================================
// Tailwind CSS v4 Output Types
// =============================================================================

/**
 * CSS variable definition for @theme
 */
export interface ThemeVariable {
  /** CSS variable name (without --) */
  name: string;
  /** CSS value */
  value: string;
  /** Optional comment */
  comment?: string;
}

/**
 * Tailwind v4 @theme output
 */
export interface TailwindThemeOutput {
  /** Theme variables for @theme directive */
  variables: ThemeVariable[];
  /** Generated @theme CSS block */
  themeCss: string;
  /** Additional CSS for dark mode (via @variant dark) */
  darkModeCss?: string;
  /** CSS for Ionic integration */
  ionicIntegrationCss?: string;
}

// =============================================================================
// Tailwind-Ionic Bridge
// =============================================================================

/**
 * Maps Ionic color names to Tailwind color paths
 */
export const IONIC_TO_TAILWIND_COLOR_MAP = {
  primary: 'ion-primary',
  secondary: 'ion-secondary',
  tertiary: 'ion-tertiary',
  success: 'ion-success',
  warning: 'ion-warning',
  danger: 'ion-danger',
  dark: 'ion-dark',
  medium: 'ion-medium',
  light: 'ion-light',
} as const;

/**
 * Generates a Tailwind color that references an Ionic CSS variable
 */
export function createIonicColorReference(ionicColorName: string): string {
  return `var(--ion-color-${ionicColorName})`;
}
