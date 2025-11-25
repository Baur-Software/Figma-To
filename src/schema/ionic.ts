/**
 * Ionic Theme Variable Mappings
 *
 * Defines the complete set of Ionic CSS custom properties
 * that can be generated from design tokens.
 *
 * Reference: https://ionicframework.com/docs/theming/css-variables
 */

// =============================================================================
// Ionic Color System
// =============================================================================

/**
 * Ionic color palette names
 * Each color generates multiple CSS variables (base, contrast, shade, tint, rgb)
 */
export const IONIC_COLOR_NAMES = [
  'primary',
  'secondary',
  'tertiary',
  'success',
  'warning',
  'danger',
  'dark',
  'medium',
  'light',
] as const;

export type IonicColorName = typeof IONIC_COLOR_NAMES[number];

/**
 * Generated CSS variables for each Ionic color
 */
export interface IonicColorVariables {
  /** Base color value */
  base: string;
  /** Contrast color for text on this background */
  contrast: string;
  /** Darker shade of the color */
  shade: string;
  /** Lighter tint of the color */
  tint: string;
  /** RGB values for alpha compositing */
  rgb: string;
  /** Contrast RGB values */
  contrastRgb: string;
}

/**
 * Complete Ionic color definition
 */
export interface IonicColor {
  name: IonicColorName;
  variables: IonicColorVariables;
}

// =============================================================================
// Ionic Theme Variables
// =============================================================================

/**
 * Application-wide Ionic CSS variables
 */
export interface IonicApplicationVariables {
  /** Application background color */
  '--ion-background-color'?: string;
  '--ion-background-color-rgb'?: string;

  /** Application text color */
  '--ion-text-color'?: string;
  '--ion-text-color-rgb'?: string;

  /** Backdrop color for modals/overlays */
  '--ion-backdrop-color'?: string;
  '--ion-backdrop-opacity'?: string;

  /** Overlay background color */
  '--ion-overlay-background-color'?: string;

  /** Border color */
  '--ion-border-color'?: string;

  /** Box shadow */
  '--ion-box-shadow-color'?: string;

  /** Tab bar background */
  '--ion-tab-bar-background'?: string;
  '--ion-tab-bar-background-focused'?: string;
  '--ion-tab-bar-border-color'?: string;
  '--ion-tab-bar-color'?: string;
  '--ion-tab-bar-color-selected'?: string;

  /** Toolbar */
  '--ion-toolbar-background'?: string;
  '--ion-toolbar-border-color'?: string;
  '--ion-toolbar-color'?: string;
  '--ion-toolbar-segment-color'?: string;
  '--ion-toolbar-segment-color-checked'?: string;
  '--ion-toolbar-segment-background'?: string;
  '--ion-toolbar-segment-background-checked'?: string;
  '--ion-toolbar-segment-indicator-color'?: string;

  /** Item */
  '--ion-item-background'?: string;
  '--ion-item-border-color'?: string;
  '--ion-item-color'?: string;

  /** Placeholder text */
  '--ion-placeholder-color'?: string;
}

/**
 * Ionic stepped colors (50, 100, 150, ..., 950)
 */
export type IonicSteppedColorStep =
  | '50' | '100' | '150' | '200' | '250' | '300' | '350' | '400' | '450' | '500'
  | '550' | '600' | '650' | '700' | '750' | '800' | '850' | '900' | '950';

export type IonicSteppedColorVariables = {
  [K in `--ion-color-step-${IonicSteppedColorStep}`]?: string;
};

// =============================================================================
// Ionic Typography Variables
// =============================================================================

/**
 * Ionic font variables
 */
export interface IonicTypographyVariables {
  '--ion-font-family'?: string;
  '--ion-default-font'?: string;
}

// =============================================================================
// Platform-Specific Variables
// =============================================================================

/**
 * iOS-specific theme variables
 */
export interface IonicIOSVariables {
  '--ion-statusbar-padding'?: string;
  '--ion-safe-area-top'?: string;
  '--ion-safe-area-right'?: string;
  '--ion-safe-area-bottom'?: string;
  '--ion-safe-area-left'?: string;
}

/**
 * Material Design (Android) specific variables
 */
export interface IonicMDVariables {
  '--ion-statusbar-padding'?: string;
}

// =============================================================================
// Complete Ionic Theme
// =============================================================================

/**
 * Complete Ionic theme definition
 * Contains all CSS custom properties needed for theming
 */
export interface IonicTheme {
  /** Color palette */
  colors: Record<IonicColorName, IonicColorVariables>;
  /** Application-wide variables */
  application: IonicApplicationVariables;
  /** Stepped colors for gradients */
  steppedColors: IonicSteppedColorVariables;
  /** Typography */
  typography: IonicTypographyVariables;
  /** Platform-specific overrides */
  platforms?: {
    ios?: Partial<IonicIOSVariables & IonicApplicationVariables>;
    md?: Partial<IonicMDVariables & IonicApplicationVariables>;
  };
}

/**
 * Ionic theme output with dark mode support
 */
export interface IonicThemeOutput {
  /** Light mode theme */
  light: IonicTheme;
  /** Dark mode theme (optional) */
  dark?: Partial<IonicTheme>;
  /** CSS output string */
  css: string;
}

// =============================================================================
// Mapping Utilities
// =============================================================================

/**
 * Maps a normalized color token path to Ionic variable name
 */
export function toIonicColorVariable(
  colorName: IonicColorName,
  variant: keyof IonicColorVariables
): string {
  const variantSuffix = variant === 'base' ? '' :
    variant === 'rgb' ? '-rgb' :
    variant === 'contrastRgb' ? '-contrast-rgb' :
    `-${variant}`;

  return `--ion-color-${colorName}${variantSuffix}`;
}

/**
 * Standard Ionic color variants that need to be generated
 */
export const IONIC_COLOR_VARIANTS: Array<keyof IonicColorVariables> = [
  'base',
  'contrast',
  'shade',
  'tint',
  'rgb',
  'contrastRgb',
];
