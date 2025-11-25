/**
 * Figma Variable Parser
 *
 * Converts Figma variables and collections into normalized design tokens.
 */

import type {
  LocalVariable,
  LocalVariableCollection,
  VariableAlias,
  RGBA,
} from '@figma/rest-api-spec';
import type {
  Token,
  TokenType,
  TokenGroup,
  TokenCollection,
  ColorValue,
  DimensionValue,
  TokenReference,
  FigmaExtensions,
} from '../../schema/tokens.js';
import { isRGBA, isVariableAlias } from '../../schema/figma.js';

/**
 * Variable value type from Figma's valuesByMode
 */
type VariableValue = boolean | number | string | RGBA | VariableAlias;

// =============================================================================
// Value Converters
// =============================================================================

/**
 * Convert Figma RGBA color to normalized ColorValue
 */
export function convertFigmaColor(color: RGBA): ColorValue {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
}

/**
 * Convert Figma numeric value to dimension
 * Figma uses pixels by default
 */
export function convertFigmaNumber(value: number, scopes: string[]): DimensionValue | number {
  // Determine if this should be a dimension based on scopes
  const dimensionScopes = [
    'CORNER_RADIUS',
    'WIDTH_HEIGHT',
    'GAP',
    'STROKE_FLOAT',
    'FONT_SIZE',
    'LINE_HEIGHT',
    'LETTER_SPACING',
    'PARAGRAPH_SPACING',
    'PARAGRAPH_INDENT',
  ];

  const isDimension = scopes.some(scope => dimensionScopes.includes(scope));

  if (isDimension) {
    return {
      value,
      unit: 'px',
    };
  }

  return value;
}

/**
 * Create a token reference from a Figma variable alias
 */
export function createTokenReference(
  alias: VariableAlias,
  variablesById: Map<string, LocalVariable>
): TokenReference {
  const referencedVar = variablesById.get(alias.id);
  if (!referencedVar) {
    // Fallback to ID if variable not found
    return { $ref: `{${alias.id}}` };
  }

  // Convert variable name path (e.g., "Colors/Primary/500" -> "colors.primary.500")
  const path = referencedVar.name
    .split('/')
    .map((segment: string) => segment.toLowerCase().replace(/\s+/g, '-'))
    .join('.');

  return { $ref: `{${path}}` };
}

// =============================================================================
// Token Type Detection
// =============================================================================

/**
 * Determine token type from Figma variable
 */
export function detectTokenType(variable: LocalVariable): TokenType {
  switch (variable.resolvedType) {
    case 'COLOR':
      return 'color';
    case 'BOOLEAN':
      return 'boolean';
    case 'STRING':
      // Could be fontFamily based on scopes
      if (variable.scopes.includes('FONT_FAMILY')) {
        return 'fontFamily';
      }
      return 'string';
    case 'FLOAT':
      // Determine specific type based on scopes
      if (variable.scopes.includes('FONT_WEIGHT')) {
        return 'fontWeight';
      }
      if (
        variable.scopes.includes('CORNER_RADIUS') ||
        variable.scopes.includes('WIDTH_HEIGHT') ||
        variable.scopes.includes('GAP') ||
        variable.scopes.includes('FONT_SIZE') ||
        variable.scopes.includes('LINE_HEIGHT') ||
        variable.scopes.includes('LETTER_SPACING')
      ) {
        return 'dimension';
      }
      return 'number';
    default:
      return 'string';
  }
}

// =============================================================================
// Token Creation
// =============================================================================

/**
 * Create a token from a Figma variable value
 */
export function createToken(
  variable: LocalVariable,
  value: VariableValue,
  variablesById: Map<string, LocalVariable>
): Token {
  const tokenType = detectTokenType(variable);

  // Build Figma extensions
  const figmaExtensions: FigmaExtensions = {
    variableId: variable.id,
    scopes: variable.scopes,
    hiddenFromPublishing: variable.hiddenFromPublishing,
  };

  if (variable.codeSyntax && Object.keys(variable.codeSyntax).length > 0) {
    figmaExtensions.codeSyntax = {
      web: variable.codeSyntax.WEB,
      android: variable.codeSyntax.ANDROID,
      ios: variable.codeSyntax.iOS,
    };
  }

  // Handle alias (reference to another variable)
  if (isVariableAlias(value)) {
    return {
      $type: tokenType,
      $value: createTokenReference(value, variablesById),
      $description: variable.description || undefined,
      $extensions: {
        'com.figma': figmaExtensions,
      },
    };
  }

  // Handle concrete values
  let tokenValue: Token['$value'];

  if (isRGBA(value)) {
    tokenValue = convertFigmaColor(value);
  } else if (typeof value === 'number') {
    const converted = convertFigmaNumber(value, variable.scopes);
    tokenValue = converted as Token['$value'];
  } else if (typeof value === 'string') {
    // Font family comes as a string but should be an array
    if (tokenType === 'fontFamily') {
      tokenValue = [value];
    } else {
      tokenValue = value;
    }
  } else {
    tokenValue = value as Token['$value'];
  }

  return {
    $type: tokenType,
    $value: tokenValue,
    $description: variable.description || undefined,
    $extensions: {
      'com.figma': figmaExtensions,
    },
  };
}

// =============================================================================
// Token Group Building
// =============================================================================

/**
 * Convert a variable path (e.g., "Colors/Primary/500") to nested group structure
 */
export function buildTokenPath(
  name: string
): { path: string[]; tokenName: string } {
  const segments = name.split('/');
  const tokenName = segments.pop() || name;
  const path = segments.map((s: string) => s.toLowerCase().replace(/\s+/g, '-'));

  return { path, tokenName: tokenName.toLowerCase().replace(/\s+/g, '-') };
}

/**
 * Set a token at a nested path in a token group
 */
export function setTokenAtPath(
  group: TokenGroup,
  path: string[],
  tokenName: string,
  token: Token
): void {
  let current = group;

  for (const segment of path) {
    if (!(segment in current)) {
      current[segment] = {} as TokenGroup;
    }
    current = current[segment] as TokenGroup;
  }

  current[tokenName] = token;
}

// =============================================================================
// Collection Parsing
// =============================================================================

/**
 * Parse a Figma variable collection into a normalized TokenCollection
 */
export function parseCollection(
  collection: LocalVariableCollection,
  variables: LocalVariable[],
  variablesById: Map<string, LocalVariable>
): TokenCollection {
  const modes = collection.modes.map((m: { modeId: string; name: string }) => m.name);
  const defaultMode = collection.modes.find((m: { modeId: string; name: string }) => m.modeId === collection.defaultModeId)?.name || modes[0];

  // Build tokens for each mode
  const tokens: Record<string, TokenGroup> = {};

  for (const mode of collection.modes) {
    const modeTokens: TokenGroup = {};

    for (const variable of variables) {
      const value = variable.valuesByMode[mode.modeId];
      if (value === undefined) continue;

      const token = createToken(variable, value, variablesById);
      const { path, tokenName } = buildTokenPath(variable.name);

      setTokenAtPath(modeTokens, path, tokenName, token);
    }

    tokens[mode.name] = modeTokens;
  }

  return {
    name: collection.name,
    description: collection.hiddenFromPublishing ? undefined : `Figma collection: ${collection.name}`,
    modes,
    defaultMode,
    tokens,
  };
}

/**
 * Parse all Figma variables into normalized token collections
 */
export function parseVariables(
  variables: Record<string, LocalVariable>,
  collections: Record<string, LocalVariableCollection>
): TokenCollection[] {
  // Build lookup maps
  const variablesById = new Map<string, LocalVariable>();
  const variablesByCollection = new Map<string, LocalVariable[]>();

  for (const variable of Object.values(variables)) {
    variablesById.set(variable.id, variable);

    const collectionVars = variablesByCollection.get(variable.variableCollectionId) || [];
    collectionVars.push(variable);
    variablesByCollection.set(variable.variableCollectionId, collectionVars);
  }

  // Parse each collection
  const result: TokenCollection[] = [];

  for (const collection of Object.values(collections)) {
    const collectionVariables = variablesByCollection.get(collection.id) || [];

    // Skip empty collections
    if (collectionVariables.length === 0) continue;

    // Skip hidden collections if needed
    if (collection.hiddenFromPublishing) continue;

    result.push(parseCollection(collection, collectionVariables, variablesById));
  }

  return result;
}
