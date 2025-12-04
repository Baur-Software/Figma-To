/**
 * TypeScript Generator for Next.js
 *
 * Generates TypeScript type definitions and constants from design tokens.
 * Provides type-safe access to design tokens in Next.js applications.
 */

import type {
  ThemeFile,
  Token,
  TokenGroup,
  ColorValue,
  DimensionValue,
} from '../../../schema/tokens.js';
import { isTokenReference } from '../../../schema/tokens.js';

// =============================================================================
// Types
// =============================================================================

export interface TypeScriptGeneratorOptions {
  /** Mode to use for token values */
  mode?: string;
  /** Generate TypeScript type definitions */
  generateTypes?: boolean;
  /** Generate constants/values */
  generateConstants?: boolean;
  /** Include comments in output */
  includeComments?: boolean;
  /** Export name for the tokens object */
  tokensExportName?: string;
  /** Export name for the types */
  typesExportName?: string;
}

export interface TypeScriptOutput {
  /** TypeScript type definitions (.d.ts content) */
  types?: string;
  /** TypeScript constants (runtime values) */
  constants?: string;
}

// =============================================================================
// Token Processing
// =============================================================================

interface TokenInfo {
  path: string[];
  token: Token;
  varName: string;
}

function collectTokens(
  group: TokenGroup,
  path: string[] = []
): TokenInfo[] {
  const result: TokenInfo[] = [];

  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('$')) continue;

    if (isToken(value)) {
      const fullPath = [...path, key];
      const varName = pathToVarName(fullPath);
      result.push({ path: fullPath, token: value, varName });
    } else if (isTokenGroup(value)) {
      result.push(...collectTokens(value, [...path, key]));
    }
  }

  return result;
}

function isToken(value: unknown): value is Token {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$type' in value &&
    '$value' in value
  );
}

function isTokenGroup(value: unknown): value is TokenGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    !('$type' in value && '$value' in value)
  );
}

function pathToVarName(path: string[]): string {
  return path.join('-').toLowerCase().replace(/\s+/g, '-');
}

function pathToPropertyPath(path: string[]): string[] {
  return path.map(p => camelCase(p));
}

function camelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
}

// Reserved for future use - generating PascalCase type names
function _pascalCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
void _pascalCase;

function getTypeScriptType(tokenType: string): string {
  switch (tokenType) {
    case 'color':
      return 'string';
    case 'dimension':
      return 'string';
    case 'fontFamily':
      return 'string';
    case 'fontWeight':
      return 'number | string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'shadow':
      return 'string';
    case 'typography':
      return 'string';
    case 'duration':
      return 'string';
    default:
      return 'string';
  }
}

function formatTokenValueForTs(token: Token): string {
  const value = token.$value;

  if (isTokenReference(value)) {
    return `"var(--${value.$ref.replace(/\./g, '-').toLowerCase()})"`;
  }

  switch (token.$type) {
    case 'color': {
      const color = value as ColorValue;
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      if (color.a < 1) {
        const a = Math.round(color.a * 255);
        return `"#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}"`;
      }
      return `"#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}"`;
    }

    case 'dimension': {
      const dim = value as DimensionValue;
      return `"${dim.value}${dim.unit}"`;
    }

    case 'fontFamily': {
      const fonts: string[] = Array.isArray(value) ? value as string[] : [String(value)];
      return `"${fonts.join(', ')}"`;
    }

    case 'number':
      return String(value);

    case 'boolean':
      return String(value);

    default:
      return `"${String(value)}"`;
  }
}

// =============================================================================
// TypeScript Generation
// =============================================================================

/**
 * Generate TypeScript types and constants from design tokens
 */
export function generateTypeScript(
  theme: ThemeFile,
  options: TypeScriptGeneratorOptions = {}
): TypeScriptOutput {
  const {
    mode,
    generateTypes = true,
    generateConstants = true,
    includeComments = true,
    tokensExportName = 'tokens',
    typesExportName = 'ThemeTokens',
  } = options;

  const allTokens: TokenInfo[] = [];

  // Collect all tokens
  for (const collection of theme.collections) {
    const selectedMode = mode || collection.defaultMode;
    const tokens = collection.tokens[selectedMode];

    if (!tokens) continue;

    allTokens.push(...collectTokens(tokens));
  }

  // Build token tree structure
  const tokenTree = buildTokenTree(allTokens);

  let types: string | undefined;
  let constants: string | undefined;

  if (generateTypes) {
    types = generateTypeDefinitions(tokenTree, {
      includeComments,
      typesExportName,
      themeName: theme.name,
    });
  }

  if (generateConstants) {
    constants = generateConstantsFile(tokenTree, allTokens, {
      includeComments,
      tokensExportName,
      typesExportName,
      themeName: theme.name,
      generateTypes,
    });
  }

  return { types, constants };
}

interface TokenTreeNode {
  children: Map<string, TokenTreeNode>;
  token?: TokenInfo;
}

function buildTokenTree(tokens: TokenInfo[]): TokenTreeNode {
  const root: TokenTreeNode = { children: new Map() };

  for (const tokenInfo of tokens) {
    let current = root;
    const propPath = pathToPropertyPath(tokenInfo.path);

    for (let i = 0; i < propPath.length; i++) {
      const segment = propPath[i];

      if (!current.children.has(segment)) {
        current.children.set(segment, { children: new Map() });
      }

      current = current.children.get(segment)!;

      // If last segment, attach token
      if (i === propPath.length - 1) {
        current.token = tokenInfo;
      }
    }
  }

  return root;
}

function generateTypeDefinitions(
  tree: TokenTreeNode,
  options: {
    includeComments: boolean;
    typesExportName: string;
    themeName: string;
  }
): string {
  const { includeComments, typesExportName, themeName } = options;

  const lines: string[] = [];

  if (includeComments) {
    lines.push('/**');
    lines.push(` * Design Token Type Definitions`);
    lines.push(` * Generated from: ${themeName}`);
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(' *');
    lines.push(' * This file provides TypeScript types for your design tokens.');
    lines.push(' */');
    lines.push('');
  }

  // Generate interface
  lines.push(`export interface ${typesExportName} {`);
  generateInterfaceMembers(tree, lines, 1, includeComments);
  lines.push('}');
  lines.push('');

  // Generate CSS variable name type
  lines.push('/** All available CSS variable names */');
  lines.push('export type ThemeVariableName =');
  const varNames = collectVarNames(tree);
  for (let i = 0; i < varNames.length; i++) {
    const isLast = i === varNames.length - 1;
    lines.push(`  | '--${varNames[i]}'${isLast ? ';' : ''}`);
  }
  lines.push('');

  // Generate helper type
  lines.push('/** Get CSS variable reference */');
  lines.push('export type ThemeVar<T extends ThemeVariableName> = `var(${T})`;');
  lines.push('');

  return lines.join('\n');
}

function generateInterfaceMembers(
  node: TokenTreeNode,
  lines: string[],
  depth: number,
  includeComments: boolean
): void {
  const indent = '  '.repeat(depth);

  for (const [key, child] of node.children) {
    if (child.token) {
      // Leaf node with token
      if (includeComments && child.token.token.$description) {
        lines.push(`${indent}/** ${child.token.token.$description} */`);
      }
      const tsType = getTypeScriptType(child.token.token.$type);
      lines.push(`${indent}${key}: ${tsType};`);
    } else if (child.children.size > 0) {
      // Nested object
      lines.push(`${indent}${key}: {`);
      generateInterfaceMembers(child, lines, depth + 1, includeComments);
      lines.push(`${indent}};`);
    }
  }
}

function collectVarNames(node: TokenTreeNode, names: string[] = []): string[] {
  if (node.token) {
    names.push(node.token.varName);
  }

  for (const child of node.children.values()) {
    collectVarNames(child, names);
  }

  return names;
}

function generateConstantsFile(
  tree: TokenTreeNode,
  allTokens: TokenInfo[],
  options: {
    includeComments: boolean;
    tokensExportName: string;
    typesExportName: string;
    themeName: string;
    generateTypes: boolean;
  }
): string {
  const { includeComments, tokensExportName, typesExportName, themeName, generateTypes } = options;

  const lines: string[] = [];

  if (includeComments) {
    lines.push('/**');
    lines.push(` * Design Token Constants`);
    lines.push(` * Generated from: ${themeName}`);
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(' *');
    lines.push(' * This file provides runtime access to design token values.');
    lines.push(' */');
    lines.push('');
  }

  // Import types if generating both
  if (generateTypes) {
    lines.push(`import type { ${typesExportName} } from './theme.d';`);
    lines.push('');
  }

  // Generate tokens object
  if (generateTypes) {
    lines.push(`export const ${tokensExportName}: ${typesExportName} = {`);
  } else {
    lines.push(`export const ${tokensExportName} = {`);
  }
  generateConstantMembers(tree, lines, 1, includeComments);
  lines.push('} as const;');
  lines.push('');

  // Generate CSS variable lookup
  lines.push('/** CSS variable names for each token */');
  lines.push('export const cssVars = {');
  generateCssVarMembers(tree, lines, 1);
  lines.push('} as const;');
  lines.push('');

  // Generate helper function
  lines.push('/**');
  lines.push(' * Get a CSS variable reference for use in styles');
  lines.push(' * @param name - The CSS variable name (without --)');
  lines.push(' * @returns CSS var() reference');
  lines.push(' */');
  lines.push('export function cssVar(name: string): string {');
  lines.push('  return `var(--${name})`;');
  lines.push('}');
  lines.push('');

  // Generate flat token map
  lines.push('/** Flat map of all token CSS variable names to values */');
  lines.push('export const tokenMap = new Map<string, string>([');
  for (const tokenInfo of allTokens) {
    const value = formatTokenValueForTs(tokenInfo.token);
    lines.push(`  ['--${tokenInfo.varName}', ${value}],`);
  }
  lines.push(']);');
  lines.push('');

  return lines.join('\n');
}

function generateConstantMembers(
  node: TokenTreeNode,
  lines: string[],
  depth: number,
  includeComments: boolean
): void {
  const indent = '  '.repeat(depth);
  const entries = Array.from(node.children.entries());

  for (let i = 0; i < entries.length; i++) {
    const [key, child] = entries[i];
    const isLast = i === entries.length - 1;
    const comma = isLast ? '' : ',';

    if (child.token) {
      if (includeComments && child.token.token.$description) {
        lines.push(`${indent}/** ${child.token.token.$description} */`);
      }
      const value = formatTokenValueForTs(child.token.token);
      lines.push(`${indent}${key}: ${value}${comma}`);
    } else if (child.children.size > 0) {
      lines.push(`${indent}${key}: {`);
      generateConstantMembers(child, lines, depth + 1, includeComments);
      lines.push(`${indent}}${comma}`);
    }
  }
}

function generateCssVarMembers(
  node: TokenTreeNode,
  lines: string[],
  depth: number
): void {
  const indent = '  '.repeat(depth);
  const entries = Array.from(node.children.entries());

  for (let i = 0; i < entries.length; i++) {
    const [key, child] = entries[i];
    const isLast = i === entries.length - 1;
    const comma = isLast ? '' : ',';

    if (child.token) {
      lines.push(`${indent}${key}: '--${child.token.varName}'${comma}`);
    } else if (child.children.size > 0) {
      lines.push(`${indent}${key}: {`);
      generateCssVarMembers(child, lines, depth + 1);
      lines.push(`${indent}}${comma}`);
    }
  }
}
