/**
 * Next.js Adapter Exports
 *
 * Output adapter for generating Next.js-compatible CSS and configuration
 * from normalized design tokens.
 */

export {
  NextJsAdapter,
  createNextJsAdapter,
} from './adapter.js';
export type {
  NextJsOutput,
  NextJsAdapterOptions,
  NextJsTailwindConfig,
} from './adapter.js';

export {
  generateNextJsCss,
} from './generator.js';
export type {
  NextJsGeneratorOptions,
  NextJsCssOutput,
  CssVariable,
} from './generator.js';

export {
  generateTypeScript,
} from './typescript-generator.js';
export type {
  TypeScriptGeneratorOptions,
  TypeScriptOutput,
} from './typescript-generator.js';

export {
  withFigmaToTheme,
  generateTheme,
  syncTheme,
} from './next-config.js';
export type {
  FigmaToNextJsOptions,
  GeneratedThemeOutput,
  NextConfigWithFigmaTo,
} from './next-config.js';

// Next.js Build Adapter (for experimental.adapterPath)
export {
  figmaToAdapter,
  default as figmaToNextJsAdapter,
} from './nextjs-adapter.js';
export type {
  NextAdapter,
  FigmaToAdapterConfig,
} from './nextjs-adapter.js';
