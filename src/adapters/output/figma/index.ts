/**
 * Figma Output Adapter Module
 *
 * Transforms normalized ThemeFile tokens into Figma Variables
 * via the Plugin API or REST API.
 */

// Main adapter
export { FigmaOutputAdapter, createFigmaOutputAdapter } from './adapter.js';

// Transformer
export { transformToFigmaVariables, resetIdCounter } from './transformer.js';
export type { TransformResult } from './transformer.js';

// Styles Transformer
export {
  typographyToTextStyle,
  shadowToEffectStyle,
  gradientToPaintStyle,
  extractStyleTokens,
} from './styles-transformer.js';

// Report
export { TransformationReportBuilder, createReport } from './report.js';

// Safety
export { checkSourceSafety, checkPluginSafety } from './safety.js';

// Types
export type {
  FigmaOutputAdapterOptions,
  FigmaOutputResult,
  TransformationReport,
  TransformationStats,
  TransformationWarning,
  SkippedToken,
  SourceCheckResult,
  WarningCode,
  PluginVariableParams,
  PluginStyleParams,
  PluginTextStyleParams,
  PluginEffectStyleParams,
  PluginPaintStyleParams,
  PluginStatus,
  WriteServerClient,
  FigmaRGBA,
  FigmaTextStyle,
  FigmaEffectStyle,
  FigmaPaintStyle,
  FigmaEffect,
  FigmaPaint,
  FigmaGradientStop,
  FigmaLineHeight,
  FigmaLetterSpacing,
} from './types.js';

export { SourceOverwriteError, PluginNotConnectedError } from './types.js';
