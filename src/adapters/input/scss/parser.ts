/**
 * SCSS Parser
 *
 * Parses SCSS variables and maps into normalized tokens.
 * Reuses color/dimension parsing from CSS adapter.
 */

import type { Token, TokenGroup } from '../../../schema/tokens.js';
import type {
  ParsedScssVariable,
  ParsedScssMap,
  DetectedScssToken,
  SCSSParseOptions,
} from './types.js';
import {
  detectTokenType,
  parseValue,
} from '../css/parser.js';

// =============================================================================
// SCSS Variable Extraction
// =============================================================================

/**
 * Extract SCSS variables from a SCSS string
 */
export function extractScssVariables(scss: string, _options: SCSSParseOptions = {}): ParsedScssVariable[] {
  const variables: ParsedScssVariable[] = [];

  // Match $variable: value; or $variable: value !default;
  // Exclude map definitions (those with parentheses containing colons)
  const lines = scss.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip map definitions (handled separately)
    if (line.includes('(') && line.includes(':')) {
      // Check if it's a map definition vs a function call
      const mapCheck = line.match(/^\s*\$([a-zA-Z_][\w-]*)\s*:\s*\(/);
      if (mapCheck) continue;
    }

    // Match simple variable declarations
    const varMatch = line.match(/^\s*\$([a-zA-Z_][\w-]*)\s*:\s*([^;]+?)\s*(!\s*default)?\s*;/);
    if (varMatch) {
      const value = varMatch[2].trim();
      // Skip if value looks like a map (starts with parenthesis)
      if (value.startsWith('(')) continue;

      variables.push({
        name: varMatch[1],
        rawValue: value,
        hasDefault: !!varMatch[3],
        line: i + 1,
      });
    }
  }

  return variables;
}

/**
 * Extract SCSS maps from a SCSS string
 */
export function extractScssMaps(scss: string, _options: SCSSParseOptions = {}): ParsedScssMap[] {
  const maps: ParsedScssMap[] = [];

  // Match $map-name: ( ... );
  const mapRegex = /\$([a-zA-Z_][\w-]*)\s*:\s*\(([\s\S]*?)\)\s*(!\s*default)?\s*;/g;
  let match;

  while ((match = mapRegex.exec(scss)) !== null) {
    const mapName = match[1];
    const mapContent = match[2];
    const hasDefault = !!match[3];

    // Parse map entries
    const entries = parseMapEntries(mapContent);

    // Calculate line number
    const beforeMatch = scss.substring(0, match.index);
    const line = beforeMatch.split('\n').length;

    maps.push({
      name: mapName,
      entries,
      hasDefault,
      line,
    });
  }

  return maps;
}

/**
 * Parse map entries from content between parentheses
 */
function parseMapEntries(content: string): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];

  // Split by comma, but be careful with nested structures
  const parts = smartSplit(content, ',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Match "key": value or key: value
    const entryMatch = trimmed.match(/^["']?([^"':]+)["']?\s*:\s*(.+)$/);
    if (entryMatch) {
      entries.push({
        key: entryMatch[1].trim(),
        value: entryMatch[2].trim(),
      });
    }
  }

  return entries;
}

/**
 * Smart split that respects nested parentheses
 */
function smartSplit(str: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of str) {
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === delimiter && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

// =============================================================================
// Variable Name to Token Path
// =============================================================================

/**
 * Convert SCSS variable name to token path
 */
export function scssVariableToPath(name: string, stripPrefix?: string): string {
  let path = name;

  // Strip prefix if specified
  if (stripPrefix && path.startsWith(stripPrefix)) {
    path = path.substring(stripPrefix.length);
  }

  // Convert common patterns
  // color-primary-500 -> color/primary/500
  path = path.replace(/-/g, '/');

  // Handle common SCSS conventions
  path = path
    .replace(/^font\/family/, 'fontFamily')
    .replace(/^font\/size/, 'fontSize')
    .replace(/^font\/weight/, 'fontWeight')
    .replace(/^line\/height/, 'lineHeight')
    .replace(/^letter\/spacing/, 'letterSpacing');

  return path;
}

/**
 * Resolve SCSS variable reference
 */
export function resolveScssReference(
  value: string,
  variables: Map<string, string>
): string {
  // Check if it's a variable reference
  if (value.startsWith('$')) {
    const varName = value.substring(1);
    const resolved = variables.get(varName);
    if (resolved) {
      // Recursively resolve
      return resolveScssReference(resolved, variables);
    }
  }
  return value;
}

// =============================================================================
// Token Detection and Parsing
// =============================================================================

/**
 * Parse SCSS variables into detected tokens
 */
export function parseScssVariables(
  variables: ParsedScssVariable[],
  stripPrefix?: string
): DetectedScssToken[] {
  const tokens: DetectedScssToken[] = [];

  // Build variable map for reference resolution
  const varMap = new Map<string, string>();
  for (const v of variables) {
    varMap.set(v.name, v.rawValue);
  }

  for (const variable of variables) {
    // Resolve any variable references
    const resolvedValue = resolveScssReference(variable.rawValue, varMap);

    // Detect type and parse value
    const type = detectTokenType(resolvedValue);
    const value = parseValue(resolvedValue, type);
    const path = scssVariableToPath(variable.name, stripPrefix);

    tokens.push({
      path,
      type,
      value,
      originalName: variable.name,
    });
  }

  return tokens;
}

/**
 * Parse SCSS map into detected tokens
 */
export function parseScssMap(
  map: ParsedScssMap,
  allVariables: Map<string, string>,
  stripPrefix?: string
): DetectedScssToken[] {
  const tokens: DetectedScssToken[] = [];
  const mapPath = scssVariableToPath(map.name, stripPrefix);

  for (const entry of map.entries) {
    // Resolve value (might be a variable reference)
    const resolvedValue = resolveScssReference(entry.value, allVariables);

    // Detect type and parse value
    const type = detectTokenType(resolvedValue);
    const value = parseValue(resolvedValue, type);

    // Build path: mapName/key
    const keyPath = entry.key.replace(/-/g, '/');
    const fullPath = `${mapPath}/${keyPath}`;

    tokens.push({
      path: fullPath,
      type,
      value,
      originalName: `${map.name}.${entry.key}`,
      fromMap: map.name,
    });
  }

  return tokens;
}

// =============================================================================
// Token Group Building
// =============================================================================

/**
 * Convert detected tokens to TokenGroup structure
 */
export function scssTokensToGroup(tokens: DetectedScssToken[]): TokenGroup {
  const group: TokenGroup = {};

  for (const token of tokens) {
    const parts = token.path.split('/');
    let current: TokenGroup = group;

    // Navigate/create nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] === 'string') {
        current[part] = {};
      }
      current = current[part] as TokenGroup;
    }

    // Set the token at the final path
    const finalKey = parts[parts.length - 1];
    current[finalKey] = {
      $type: token.type,
      $value: token.value,
    } as Token;
  }

  return group;
}

/**
 * Extract all variables and maps, returning unified token list
 */
export function extractAllScssTokens(
  scss: string,
  options: SCSSParseOptions = {}
): DetectedScssToken[] {
  const { parseMaps = true, stripPrefix } = options;

  // Extract variables
  const variables = extractScssVariables(scss, options);
  const tokens = parseScssVariables(variables, stripPrefix);

  // Build variable map for map value resolution
  const varMap = new Map<string, string>();
  for (const v of variables) {
    varMap.set(v.name, v.rawValue);
  }

  // Extract and parse maps
  if (parseMaps) {
    const maps = extractScssMaps(scss, options);
    for (const map of maps) {
      const mapTokens = parseScssMap(map, varMap, stripPrefix);
      tokens.push(...mapTokens);
    }
  }

  return tokens;
}
