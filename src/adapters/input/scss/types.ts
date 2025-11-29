/**
 * SCSS Input Adapter Types
 */

import type { CSSTokenType } from '../css/types.js';

/**
 * Input options for SCSS adapter
 */
export interface SCSSInput {
  /** Raw SCSS string */
  scss: string;
  /** Source file name (for metadata) */
  fileName?: string;
  /** Parse options */
  options?: SCSSParseOptions;
}

/**
 * Options for SCSS parsing
 */
export interface SCSSParseOptions {
  /** Name of the default mode for parsed tokens */
  defaultMode?: string;
  /** Collection name for parsed tokens */
  collectionName?: string;
  /** Whether to parse SCSS maps into nested tokens */
  parseMaps?: boolean;
  /** Custom variable prefix to strip (e.g., "theme-" -> "") */
  stripPrefix?: string;
}

/**
 * Parsed SCSS variable
 */
export interface ParsedScssVariable {
  /** Variable name without $ prefix */
  name: string;
  /** Raw value string */
  rawValue: string;
  /** Whether it has !default flag */
  hasDefault: boolean;
  /** Line number in source */
  line?: number;
}

/**
 * Parsed SCSS map
 */
export interface ParsedScssMap {
  /** Map name without $ prefix */
  name: string;
  /** Key-value pairs */
  entries: Array<{ key: string; value: string }>;
  /** Whether it has !default flag */
  hasDefault: boolean;
  /** Line number in source */
  line?: number;
}

/**
 * Token type detection result (same as CSS)
 */
export { CSSTokenType as SCSSTokenType };

/**
 * Detected token from SCSS
 */
export interface DetectedScssToken {
  /** Token path (e.g., "color/primary/500") */
  path: string;
  /** Detected token type */
  type: CSSTokenType;
  /** Parsed value */
  value: unknown;
  /** Original variable name */
  originalName: string;
  /** Whether from a map */
  fromMap?: string;
}
