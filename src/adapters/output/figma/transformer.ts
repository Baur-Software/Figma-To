/**
 * Token Transformer
 *
 * Transforms normalized ThemeFile tokens into Figma Variables API format.
 */

import type {
  ThemeFile,
  Token,
  TokenGroup,
  TokenType,
  ColorValue,
  DimensionValue,
} from '../../../schema/tokens.js';
import { isTokenReference } from '../../../schema/tokens.js';
import type {
  VariableCreate,
  VariableCollectionCreate,
  VariableModeCreate,
  VariableModeValue,
  PostVariablesRequestBody,
  VariableResolvedDataType,
  VariableValue,
} from '@figma/rest-api-spec';
import type { FigmaOutputAdapterOptions } from './types.js';
import { TransformationReportBuilder } from './report.js';

// =============================================================================
// Type Mapping
// =============================================================================

/**
 * Map normalized token types to Figma resolved types
 */
const TOKEN_TYPE_TO_FIGMA: Partial<Record<TokenType, VariableResolvedDataType>> = {
  color: 'COLOR',
  dimension: 'FLOAT',
  number: 'FLOAT',
  string: 'STRING',
  boolean: 'BOOLEAN',
  fontFamily: 'STRING',
  fontWeight: 'FLOAT',
  duration: 'FLOAT',
};

/**
 * Token types that should be skipped (not representable as Figma variables)
 */
const SKIP_TYPES: TokenType[] = [
  'typography',
  'shadow',
  'border',
  'gradient',
  'cubicBezier',
  'transition',
  'animation',
  'keyframes',
];

// =============================================================================
// ID Generation
// =============================================================================

let idCounter = 0;

/**
 * Generate a temporary ID for Figma API requests
 */
function generateTempId(prefix: string = 'temp'): string {
  return `${prefix}_${++idCounter}`;
}

/**
 * Reset ID counter (for testing)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

// =============================================================================
// Value Converters
// =============================================================================

/**
 * Convert a color value to Figma RGBA format (0-1 range)
 */
function colorToFigmaRGBA(color: ColorValue): { r: number; g: number; b: number; a: number } {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
}

/**
 * Convert a dimension value to a number (strips unit)
 */
function dimensionToNumber(dim: DimensionValue, report: TransformationReportBuilder, path: string): number {
  if (dim.unit !== 'px') {
    report.addWarning(
      'UNIT_DISCARDED',
      `Unit '${dim.unit}' discarded, stored as raw number`,
      path
    );
  }
  return dim.value;
}

/**
 * Convert a font weight value to a number
 */
function fontWeightToNumber(weight: number | string): number {
  if (typeof weight === 'number') {
    return weight;
  }
  // Convert keyword to numeric value
  const keywords: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900,
  };
  return keywords[weight.toLowerCase()] ?? 400;
}

/**
 * Convert a token value to Figma variable value
 */
function tokenValueToFigma(
  token: Token,
  report: TransformationReportBuilder,
  path: string
): unknown | null {
  // Handle references
  if (isTokenReference(token.$value)) {
    // For now, we skip references - they need special handling
    report.addSkipped(
      path,
      'Token references require special handling',
      token.$type,
      'References will be supported in a future update'
    );
    return null;
  }

  switch (token.$type) {
    case 'color':
      return colorToFigmaRGBA(token.$value as ColorValue);

    case 'dimension':
      return dimensionToNumber(token.$value as DimensionValue, report, path);

    case 'number':
      return token.$value as number;

    case 'string':
      return token.$value as string;

    case 'boolean':
      return token.$value as boolean;

    case 'fontFamily': {
      const families = token.$value as string[];
      if (families.length > 1) {
        report.addWarning(
          'VALUE_TRUNCATED',
          `Font stack truncated to first family: ${families[0]}`,
          path
        );
      }
      return families[0] || '';
    }

    case 'fontWeight':
      return fontWeightToNumber(token.$value as number | string);

    case 'duration': {
      const dur = token.$value as { value: number; unit: string };
      // Convert to milliseconds
      return dur.unit === 's' ? dur.value * 1000 : dur.value;
    }

    default:
      return null;
  }
}

// =============================================================================
// Token Traversal
// =============================================================================

interface FlattenedToken {
  path: string[];
  token: Token;
}

/**
 * Flatten a token group into a list of path/token pairs
 */
function flattenTokens(group: TokenGroup, basePath: string[] = []): FlattenedToken[] {
  const results: FlattenedToken[] = [];

  for (const [key, value] of Object.entries(group)) {
    // Skip undefined, strings, and metadata keys
    if (value === undefined || typeof value === 'string' || key.startsWith('$')) {
      continue;
    }

    const currentPath = [...basePath, key];

    // Check if this is a token (has $type) or a group
    if ('$type' in value && typeof value.$type === 'string') {
      results.push({
        path: currentPath,
        token: value as Token,
      });
    } else {
      // Recurse into nested group
      results.push(...flattenTokens(value as TokenGroup, currentPath));
    }
  }

  return results;
}

// =============================================================================
// Main Transformer
// =============================================================================

/**
 * Transform result with request body and report
 */
export interface TransformResult {
  requestBody: PostVariablesRequestBody;
  report: TransformationReportBuilder;
}

/**
 * Transform a ThemeFile into Figma Variables API request body
 */
export function transformToFigmaVariables(
  theme: ThemeFile,
  options: FigmaOutputAdapterOptions = {}
): TransformResult {
  const report = new TransformationReportBuilder();
  const prefix = options.idPrefix || 'temp';

  // Reset ID counter for consistent IDs
  resetIdCounter();

  // Set up source check
  report.setSourceCheck(
    theme.meta?.figmaFileKey,
    options.targetFileKey,
    options.allowSourceOverwrite ?? false
  );

  // Initialize request body
  const requestBody: PostVariablesRequestBody = {
    variableCollections: [],
    variableModes: [],
    variables: [],
    variableModeValues: [],
  };

  // Maps for ID lookups
  const collectionIds = new Map<string, string>();
  const modeIds = new Map<string, Map<string, string>>();
  const variableIds = new Map<string, string>();

  // Process each collection
  for (const collection of theme.collections) {
    const collectionName = options.collectionMapping?.[collection.name] ?? collection.name;
    const collectionId = generateTempId(`${prefix}_col`);
    collectionIds.set(collection.name, collectionId);

    // Create collection
    const collectionCreate: VariableCollectionCreate = {
      action: 'CREATE',
      id: collectionId,
      name: collectionName,
      initialModeId: generateTempId(`${prefix}_mode`),
    };
    requestBody.variableCollections!.push(collectionCreate);
    report.addCollection();

    // Create mode ID map for this collection
    const collectionModeIds = new Map<string, string>();
    modeIds.set(collection.name, collectionModeIds);

    // Set initial mode ID
    collectionModeIds.set(collection.defaultMode, collectionCreate.initialModeId!);

    // Create additional modes
    for (const modeName of collection.modes) {
      if (modeName === collection.defaultMode) continue;

      const modeId = generateTempId(`${prefix}_mode`);
      collectionModeIds.set(modeName, modeId);

      const modeCreate: VariableModeCreate = {
        action: 'CREATE',
        id: modeId,
        name: modeName,
        variableCollectionId: collectionId,
      };
      requestBody.variableModes!.push(modeCreate);
      report.addMode();
    }

    // Get tokens from default mode to determine variable structure
    const defaultTokens = collection.tokens[collection.defaultMode];
    if (!defaultTokens) continue;

    const flattenedTokens = flattenTokens(defaultTokens);

    // Create variables
    for (const { path, token } of flattenedTokens) {
      // Check if type is supported
      if (SKIP_TYPES.includes(token.$type)) {
        report.addSkipped(
          path.join('.'),
          `Token type '${token.$type}' is not supported as a Figma variable`,
          token.$type,
          'Consider using Figma Styles API for composite types'
        );
        continue;
      }

      const figmaType = TOKEN_TYPE_TO_FIGMA[token.$type];
      if (!figmaType) {
        report.addSkipped(
          path.join('.'),
          `Unknown token type: ${token.$type}`,
          token.$type
        );
        continue;
      }

      // Skip hidden tokens if requested
      if (options.skipHidden && token.$extensions?.['com.figma']?.hiddenFromPublishing) {
        continue;
      }

      const variableName = path.join('/');
      const variableId = generateTempId(`${prefix}_var`);
      variableIds.set(`${collection.name}:${variableName}`, variableId);

      // Create variable
      const variableCreate: VariableCreate = {
        action: 'CREATE',
        id: variableId,
        name: variableName,
        variableCollectionId: collectionId,
        resolvedType: figmaType,
        description: token.$description,
      };
      requestBody.variables!.push(variableCreate);
      report.addVariable();

      // Set values for each mode
      for (const modeName of collection.modes) {
        const modeTokens = collection.tokens[modeName];
        if (!modeTokens) continue;

        // Navigate to token in this mode
        let modeToken: Token | undefined;
        let current: TokenGroup | Token | undefined = modeTokens;
        for (const segment of path) {
          if (current && typeof current === 'object' && segment in current) {
            current = (current as Record<string, unknown>)[segment] as TokenGroup | Token;
          } else {
            current = undefined;
            break;
          }
        }
        if (current && '$type' in current) {
          modeToken = current as Token;
        }

        if (!modeToken) continue;

        const modeId = collectionModeIds.get(modeName);
        if (!modeId) continue;

        const figmaValue = tokenValueToFigma(modeToken, report, `${collection.name}.${modeName}.${path.join('.')}`);
        if (figmaValue === null) continue;

        const modeValue: VariableModeValue = {
          variableId,
          modeId,
          value: figmaValue as VariableValue,
        };
        requestBody.variableModeValues!.push(modeValue);
        report.addValue();
      }
    }
  }

  return { requestBody, report };
}
