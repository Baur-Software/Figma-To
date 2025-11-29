/**
 * Output Adapters
 *
 * Adapters that transform the normalized ThemeFile format into target outputs.
 */

// Tailwind/Ionic Output Adapter
export {
  TailwindIonicAdapter,
  createTailwindIonicAdapter,
  type TailwindIonicOutput,
  type TailwindIonicAdapterOptions,
  generateTailwindTheme,
  generateCompleteCss,
  type TailwindGeneratorOptions,
  generateIonicTheme,
  generateIonicDarkTheme,
  type IonicGeneratorOptions,
  type IonicGeneratorOutput,
} from './tailwind-ionic/index.js';

export * from './tailwind-ionic/converters.js';

// SCSS Output Adapter
export {
  ScssAdapter,
  createScssAdapter,
  type ScssOutput,
  type ScssAdapterOptions,
} from './scss/index.js';

// Figma Output Adapter
export {
  FigmaOutputAdapter,
  createFigmaOutputAdapter,
  transformToFigmaVariables,
  resetIdCounter,
  TransformationReportBuilder,
  createReport,
  checkSourceSafety,
  checkPluginSafety,
  SourceOverwriteError,
  PluginNotConnectedError,
  type TransformResult,
  type FigmaOutputAdapterOptions,
  type FigmaOutputResult,
  type TransformationReport,
  type TransformationStats,
  type TransformationWarning,
  type SkippedToken,
  type SourceCheckResult,
  type WarningCode,
  type PluginVariableParams,
  type PluginStyleParams,
  type PluginStatus,
  type WriteServerClient,
} from './figma/index.js';
