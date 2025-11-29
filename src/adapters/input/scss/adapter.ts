/**
 * SCSS Input Adapter
 *
 * Parses SCSS files with $variables and maps
 * into normalized design tokens.
 */

import type { ThemeFile, InputAdapter, TokenCollection } from '../../../schema/tokens.js';
import type { SCSSInput } from './types.js';
import { extractAllScssTokens, scssTokensToGroup } from './parser.js';

// =============================================================================
// SCSS Adapter Implementation
// =============================================================================

/**
 * SCSS Input Adapter
 *
 * Parses SCSS $variables and maps into the normalized token format.
 */
export class SCSSAdapter implements InputAdapter<SCSSInput> {
  readonly id = 'scss';
  readonly name = 'SCSS Input Adapter';

  /**
   * Validate SCSS input
   */
  async validate(source: SCSSInput): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (source.scss === undefined || source.scss === null) {
      errors.push('SCSS content is required');
    } else if (typeof source.scss !== 'string') {
      errors.push('SCSS content must be a string');
    } else if (source.scss.trim().length === 0) {
      errors.push('SCSS content is empty');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse SCSS into normalized theme format
   */
  async parse(source: SCSSInput): Promise<ThemeFile> {
    // Validate first
    const validation = await this.validate(source);
    if (!validation.valid) {
      throw new Error(`Invalid SCSS input: ${validation.errors?.join(', ')}`);
    }

    const options = source.options || {};
    const {
      defaultMode = 'default',
      collectionName = 'tokens',
    } = options;

    // Extract all tokens from SCSS
    const tokens = extractAllScssTokens(source.scss, options);

    // Build token group
    const tokenGroup = scssTokensToGroup(tokens);

    // Create collection
    const collection: TokenCollection = {
      name: collectionName,
      modes: [defaultMode],
      defaultMode,
      tokens: {
        [defaultMode]: tokenGroup,
      },
    };

    // Build theme file
    const theme: ThemeFile = {
      $schema: 'https://figma-to-tailwind.dev/schema/v1/theme.json',
      name: source.fileName || 'SCSS Theme',
      description: 'Design tokens parsed from SCSS',
      collections: [collection],
      meta: {
        source: 'manual',
        lastSynced: new Date().toISOString(),
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
 * Create a new SCSS adapter instance
 */
export function createSCSSAdapter(): SCSSAdapter {
  return new SCSSAdapter();
}
