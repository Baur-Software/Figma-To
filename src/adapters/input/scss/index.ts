/**
 * SCSS Input Adapter Module
 *
 * Parses SCSS $variables and maps into normalized design tokens.
 */

// Adapter
export { SCSSAdapter, createSCSSAdapter } from './adapter.js';

// Parser utilities
export {
  extractScssVariables,
  extractScssMaps,
  parseScssVariables,
  parseScssMap,
  scssVariableToPath,
  resolveScssReference,
  scssTokensToGroup,
  extractAllScssTokens,
} from './parser.js';

// Types
export type {
  SCSSInput,
  SCSSParseOptions,
  ParsedScssVariable,
  ParsedScssMap,
  DetectedScssToken,
} from './types.js';
