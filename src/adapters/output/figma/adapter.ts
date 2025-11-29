/**
 * Figma Output Adapter
 *
 * Transforms normalized ThemeFile tokens into Figma Variables
 * via the Plugin API (write-server) or REST API.
 */

import type { ThemeFile, OutputAdapter } from '../../../schema/tokens.js';
import type {
  FigmaOutputAdapterOptions,
  FigmaOutputResult,
  WriteServerClient,
} from './types.js';
import { transformToFigmaVariables } from './transformer.js';
import { checkSourceSafety } from './safety.js';

// =============================================================================
// Adapter Class
// =============================================================================

/**
 * Figma output adapter for pushing design tokens back to Figma
 */
export class FigmaOutputAdapter implements OutputAdapter<FigmaOutputResult> {
  readonly id = 'figma-output';
  readonly name = 'Figma Output Adapter';

  private writeClient?: WriteServerClient;

  /**
   * Create a new Figma output adapter
   *
   * @param writeClient Optional write client for Plugin API integration
   */
  constructor(writeClient?: WriteServerClient) {
    this.writeClient = writeClient;
  }

  /**
   * Transform a ThemeFile into Figma Variables format
   */
  async transform(
    theme: ThemeFile,
    options: FigmaOutputAdapterOptions = {}
  ): Promise<FigmaOutputResult> {
    // Perform source safety check
    checkSourceSafety(theme, options);

    // Transform tokens to Figma format
    const { requestBody, report } = transformToFigmaVariables(theme, options);

    // Add source match warning if applicable
    if (report.sourceCheck.isSameFile && report.sourceCheck.overwriteAllowed) {
      report.addWarning(
        'SOURCE_MATCH',
        'Target file matches source file - proceeding with explicit permission'
      );
    }

    // Build result
    const result: FigmaOutputResult = {
      requestBody,
      report,

      getManualInstructions: () => this.getManualInstructions(
        options.targetFileKey || '<YOUR_FILE_KEY>',
        requestBody
      ),
    };

    // Add execute method if write client is available
    if (this.writeClient) {
      result.execute = async () => {
        // Check plugin connection
        const status = await this.writeClient!.getStatus();
        if (!status.connected) {
          throw new Error('Figma plugin is not connected');
        }

        // For now, return a mock response
        // Full Plugin API integration will be implemented in Phase 2
        return {
          status: 200,
          error: false,
          meta: {
            tempIdToRealId: {},
          },
        };
      };
    }

    return result;
  }

  /**
   * Generate manual instructions for users without Plugin API access
   */
  private getManualInstructions(
    targetFileKey: string,
    requestBody: unknown
  ): string {
    return `
To push these variables to Figma, use the REST API:

POST https://api.figma.com/v1/files/${targetFileKey}/variables

Headers:
  X-Figma-Token: YOUR_TOKEN

Body:
${JSON.stringify(requestBody, null, 2)}

Note: Requires Figma Enterprise plan with file_variables:write scope.

Alternatively, use the Figma MCP Write Server for Plugin API access:
https://github.com/oO/figma-mcp-write-server
`.trim();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Figma output adapter
 *
 * @param writeClient Optional write client for Plugin API integration
 */
export function createFigmaOutputAdapter(
  writeClient?: WriteServerClient
): FigmaOutputAdapter {
  return new FigmaOutputAdapter(writeClient);
}
