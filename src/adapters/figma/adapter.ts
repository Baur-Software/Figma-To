/**
 * Figma Input Adapter
 *
 * Converts Figma MCP server responses and REST API data
 * into normalized design tokens.
 */

import type {
  LocalVariable,
  LocalVariableCollection,
  GetLocalVariablesResponse,
} from '@figma/rest-api-spec';
import type { FigmaMCPDataResponse } from '../../schema/figma.js';
import type {
  ThemeFile,
  InputAdapter,
} from '../../schema/tokens.js';
import { parseVariables } from './parser.js';

// =============================================================================
// Input Types
// =============================================================================

/**
 * Combined input from Figma sources
 */
export interface FigmaInput {
  /** Data from MCP get_figma_data tool */
  mcpData?: FigmaMCPDataResponse;
  /** Data from REST API /variables/local endpoint */
  variablesResponse?: GetLocalVariablesResponse;
  /** Figma file key (for metadata) */
  fileKey?: string;
}

// =============================================================================
// Figma Adapter Implementation
// =============================================================================

/**
 * Figma MCP/API Input Adapter
 *
 * Parses design data from Figma's MCP server or REST API
 * and converts it to the normalized token format.
 */
export class FigmaAdapter implements InputAdapter<FigmaInput> {
  readonly id = 'figma';
  readonly name = 'Figma MCP/API Adapter';

  /**
   * Validate Figma input data
   */
  async validate(source: FigmaInput): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (!source.mcpData && !source.variablesResponse) {
      errors.push('Either mcpData or variablesResponse must be provided');
    }

    if (source.mcpData) {
      if (!source.mcpData.name) {
        errors.push('MCP data missing file name');
      }
    }

    if (source.variablesResponse) {
      if (source.variablesResponse.error) {
        errors.push('Variables response contains error');
      }
      if (!source.variablesResponse.meta?.variables) {
        errors.push('Variables response missing variables data');
      }
      if (!source.variablesResponse.meta?.variableCollections) {
        errors.push('Variables response missing collections data');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse Figma data into normalized theme format
   */
  async parse(source: FigmaInput): Promise<ThemeFile> {
    // Validate first
    const validation = await this.validate(source);
    if (!validation.valid) {
      throw new Error(`Invalid Figma input: ${validation.errors?.join(', ')}`);
    }

    // Extract variables and collections from source
    let variables: Record<string, LocalVariable>;
    let collections: Record<string, LocalVariableCollection>;
    let fileName = 'Untitled';
    let lastModified: string | undefined;

    if (source.variablesResponse) {
      // Prefer REST API response (more complete)
      variables = source.variablesResponse.meta.variables;
      collections = source.variablesResponse.meta.variableCollections;
    } else if (source.mcpData) {
      // Fall back to MCP data
      variables = source.mcpData.variables || {};
      collections = source.mcpData.variableCollections || {};
      fileName = source.mcpData.name;
      lastModified = source.mcpData.lastModified;
    } else {
      throw new Error('No valid data source');
    }

    // Parse variables into collections
    const tokenCollections = parseVariables(variables, collections);

    // Determine source type
    const sourceType = source.variablesResponse ? 'figma-api' : 'figma-mcp';

    // Build theme file
    const theme: ThemeFile = {
      $schema: 'https://figma-to-tailwind.dev/schema/v1/theme.json',
      name: fileName,
      description: `Design tokens exported from Figma file: ${fileName}`,
      collections: tokenCollections,
      meta: {
        source: sourceType,
        figmaFileKey: source.fileKey,
        lastSynced: lastModified || new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return theme;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Figma adapter instance
 */
export function createFigmaAdapter(): FigmaAdapter {
  return new FigmaAdapter();
}
