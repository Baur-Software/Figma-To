/**
 * Next.js Build Adapter
 *
 * Implements the official Next.js NextAdapter interface for integration
 * with Next.js's experimental Build Adapters API (adapterPath).
 *
 * This adapter hooks into Next.js's build lifecycle to generate theme
 * files from Figma design tokens at build time.
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js/adapterPath
 *
 * @example
 * ```javascript
 * // next.config.js
 * const nextConfig = {
 *   experimental: {
 *     adapterPath: require.resolve('@baur-software/figma-to/nextjs-adapter'),
 *   },
 * }
 * module.exports = nextConfig
 * ```
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import type { ThemeFile } from '../../../schema/tokens.js';
import { createFigmaAdapter } from '../../input/figma/index.js';
import { createNextJsAdapter, type NextJsAdapterOptions } from './adapter.js';
import type { GetLocalVariablesResponse } from '@figma/rest-api-spec';

// =============================================================================
// Next.js Adapter Interface Types
// =============================================================================

/**
 * Build phase constants from Next.js
 */
type PHASE_TYPE =
  | 'phase-export'
  | 'phase-production-build'
  | 'phase-production-server'
  | 'phase-development-server'
  | 'phase-test';

/**
 * Next.js configuration (simplified for our use case)
 */
interface NextConfigComplete {
  [key: string]: unknown;
  env?: Record<string, string>;
  experimental?: {
    adapterPath?: string;
    [key: string]: unknown;
  };
}

/**
 * Route manifest types
 */
interface ManifestRoute {
  page: string;
  regex: string;
  routeKeys?: Record<string, string>;
  namedRegex?: string;
}

interface ManifestHeaderRoute {
  source: string;
  headers: Array<{ key: string; value: string }>;
  regex: string;
}

interface ManifestRedirectRoute {
  source: string;
  destination: string;
  statusCode?: number;
  permanent?: boolean;
  regex: string;
}

interface ManifestRewriteRoute {
  source: string;
  destination: string;
  regex: string;
}

/**
 * Adapter output types
 */
interface AdapterOutput {
  pathname: string;
  filePath: string;
}

interface AdapterOutputs {
  pages: AdapterOutput[];
  pagesApi: AdapterOutput[];
  appPages: AdapterOutput[];
  prerenders: Array<{ pathname: string }>;
}

/**
 * Official Next.js Adapter interface
 */
export interface NextAdapter {
  name: string;
  modifyConfig?: (
    config: NextConfigComplete,
    ctx: { phase: PHASE_TYPE }
  ) => Promise<NextConfigComplete> | NextConfigComplete;
  onBuildComplete?: (ctx: {
    routes: {
      headers: Array<ManifestHeaderRoute>;
      redirects: Array<ManifestRedirectRoute>;
      rewrites: {
        beforeFiles: Array<ManifestRewriteRoute>;
        afterFiles: Array<ManifestRewriteRoute>;
        fallback: Array<ManifestRewriteRoute>;
      };
      dynamicRoutes: ReadonlyArray<ManifestRoute>;
    };
    outputs: AdapterOutputs;
    projectDir: string;
    repoRoot: string;
    distDir: string;
    config: NextConfigComplete;
    nextVersion: string;
  }) => Promise<void> | void;
}

// =============================================================================
// Figma-To Adapter Configuration
// =============================================================================

/**
 * Configuration for the Figma-To Next.js adapter
 * Can be set via environment variables or figma-to.config.js
 */
export interface FigmaToAdapterConfig {
  /** Figma file key */
  figmaFileKey?: string;
  /** Figma API token */
  figmaToken?: string;
  /** Output directory for theme files (relative to project root) */
  outputDir?: string;
  /** Pre-fetched variables response (for testing or caching) */
  variablesResponse?: GetLocalVariablesResponse;
  /** Pre-built theme (skip Figma API) */
  theme?: ThemeFile;
  /** Adapter options for CSS generation */
  adapterOptions?: NextJsAdapterOptions;
  /** Generate theme during development server */
  generateOnDev?: boolean;
  /** Generate theme during production build */
  generateOnBuild?: boolean;
}

/**
 * Load adapter configuration from various sources
 */
function loadAdapterConfig(projectDir: string): FigmaToAdapterConfig {
  const config: FigmaToAdapterConfig = {
    figmaFileKey: process.env.FIGMA_FILE_KEY,
    figmaToken: process.env.FIGMA_TOKEN,
    outputDir: process.env.FIGMA_TO_OUTPUT_DIR || './src/theme',
    generateOnDev: process.env.FIGMA_TO_DEV !== 'false',
    generateOnBuild: process.env.FIGMA_TO_BUILD !== 'false',
  };

  // Try to load from figma-to.config.js
  const configPaths = [
    join(projectDir, 'figma-to.config.js'),
    join(projectDir, 'figma-to.config.mjs'),
    join(projectDir, '.figmatorc.js'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        // Dynamic import for ESM compatibility
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fileConfig = require(configPath);
        Object.assign(config, fileConfig.nextjs || fileConfig);
      } catch {
        // Ignore config load errors
      }
      break;
    }
  }

  // Try to load from package.json
  const packageJsonPath = join(projectDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson['figma-to']?.nextjs) {
        Object.assign(config, packageJson['figma-to'].nextjs);
      }
    } catch {
      // Ignore package.json parse errors
    }
  }

  return config;
}

/**
 * Generate theme files from configuration
 */
async function generateThemeFromConfig(
  config: FigmaToAdapterConfig,
  projectDir: string
): Promise<void> {
  const {
    figmaFileKey,
    figmaToken,
    theme: prebuiltTheme,
    variablesResponse,
    outputDir = './src/theme',
    adapterOptions = {},
  } = config;

  let theme: ThemeFile;

  // Get theme from source
  if (prebuiltTheme) {
    theme = prebuiltTheme;
  } else if (variablesResponse && figmaFileKey) {
    const figmaAdapter = createFigmaAdapter();
    theme = await figmaAdapter.parse({ variablesResponse, fileKey: figmaFileKey });
  } else if (figmaFileKey && figmaToken) {
    console.log('[figma-to] Fetching design tokens from Figma...');

    const response = await fetch(
      `https://api.figma.com/v1/files/${figmaFileKey}/variables/local`,
      { headers: { 'X-Figma-Token': figmaToken } }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Figma API error: ${response.status} ${response.statusText}\n${text}`);
    }

    const vars = await response.json() as GetLocalVariablesResponse;
    const figmaAdapter = createFigmaAdapter();
    theme = await figmaAdapter.parse({ variablesResponse: vars, fileKey: figmaFileKey });
  } else {
    console.log('[figma-to] Skipping theme generation - no Figma credentials configured');
    return;
  }

  // Generate output
  console.log('[figma-to] Generating theme files...');
  const nextAdapter = createNextJsAdapter();
  const output = await nextAdapter.transform(theme, adapterOptions);

  // Resolve output directory
  const resolvedOutputDir = join(projectDir, outputDir);

  // Ensure output directory exists
  if (!existsSync(resolvedOutputDir)) {
    mkdirSync(resolvedOutputDir, { recursive: true });
  }

  // Write files
  const writtenFiles: string[] = [];

  for (const [filename, content] of Object.entries(output.files)) {
    if (content) {
      const filepath = join(resolvedOutputDir, filename);
      const dir = dirname(filepath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filepath, content);
      writtenFiles.push(filepath);
    }
  }

  console.log(`[figma-to] Generated ${writtenFiles.length} theme files:`);
  for (const file of writtenFiles) {
    console.log(`  - ${file}`);
  }
}

// =============================================================================
// Next.js Adapter Implementation
// =============================================================================

/**
 * Figma-To Next.js Adapter
 *
 * Implements the Next.js NextAdapter interface to generate theme files
 * from Figma design tokens during the build process.
 */
const figmaToAdapter: NextAdapter = {
  name: 'figma-to-nextjs',

  /**
   * Modify Next.js config before build
   * Injects environment variables for theme paths
   */
  async modifyConfig(config, { phase }) {
    const projectDir = process.cwd();
    const adapterConfig = loadAdapterConfig(projectDir);

    // Generate theme during dev server start
    if (phase === 'phase-development-server' && adapterConfig.generateOnDev) {
      try {
        await generateThemeFromConfig(adapterConfig, projectDir);
      } catch (error) {
        console.error('[figma-to] Error generating theme:', error);
      }
    }

    // Generate theme at start of production build
    if (phase === 'phase-production-build' && adapterConfig.generateOnBuild) {
      try {
        await generateThemeFromConfig(adapterConfig, projectDir);
      } catch (error) {
        console.error('[figma-to] Error generating theme:', error);
        // Don't fail the build, just warn
      }
    }

    // Inject theme path into env for runtime access
    const outputDir = adapterConfig.outputDir || './src/theme';

    return {
      ...config,
      env: {
        ...config.env,
        FIGMA_TO_THEME_DIR: outputDir,
      },
    };
  },

  /**
   * Called after build completes
   * Can be used for post-build processing or verification
   */
  async onBuildComplete({ projectDir }) {
    const adapterConfig = loadAdapterConfig(projectDir);

    // Verify theme files exist
    const outputDir = adapterConfig.outputDir || './src/theme';
    const resolvedOutputDir = join(projectDir, outputDir);

    if (existsSync(join(resolvedOutputDir, 'theme.css'))) {
      console.log('[figma-to] Theme files verified in build output');
    } else {
      console.warn('[figma-to] Warning: theme.css not found in output directory');
    }
  },
};

// Export the adapter for use with experimental.adapterPath
export default figmaToAdapter;

// Also export for named imports
export { figmaToAdapter };
