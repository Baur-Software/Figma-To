#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { figmaToTailwind } from './index.js';
import type { GetLocalVariablesResponse } from '@figma/rest-api-spec';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
@baur-software/figma-to - Transform Figma design tokens to CSS

Usage:
  figma-to sync [options]     Sync Figma variables to CSS files
  figma-to --help             Show this help message
  figma-to --version          Show version

Sync Options:
  --file-key <key>            Figma file key (required, or set FIGMA_FILE_KEY)
  --token <token>             Figma API token (required, or set FIGMA_TOKEN)
  --out <dir>                 Output directory (default: ./theme)
  --format <hex|oklch>        Color format (default: oklch)
  --framework <name>          Framework: solidjs, react, vue, angular

Examples:
  figma-to sync --file-key abc123 --token figd_xxx
  FIGMA_FILE_KEY=abc123 FIGMA_TOKEN=figd_xxx figma-to sync
  figma-to sync --out src/styles --format hex
`);
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      result[key] = value;
    }
  }
  return result;
}

async function sync(args: string[]) {
  const opts = parseArgs(args);

  const fileKey = opts['file-key'] || process.env.FIGMA_FILE_KEY;
  const token = opts['token'] || process.env.FIGMA_TOKEN;
  const outDir = opts['out'] || './theme';
  const colorFormat = (opts['format'] as 'hex' | 'oklch') || 'oklch';
  const framework = opts['framework'] as 'solidjs' | 'react' | 'vue' | 'angular' | undefined;

  if (!fileKey) {
    console.error('Error: --file-key or FIGMA_FILE_KEY is required');
    process.exit(1);
  }

  if (!token) {
    console.error('Error: --token or FIGMA_TOKEN is required');
    process.exit(1);
  }

  console.log(`Fetching variables from Figma file ${fileKey}...`);

  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/variables/local`,
    { headers: { 'X-Figma-Token': token } }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`Figma API error: ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  const variablesResponse = await response.json() as GetLocalVariablesResponse;

  console.log('Generating theme CSS...');

  const output = await figmaToTailwind(
    { variablesResponse, fileKey },
    {
      tailwind: { colorFormat },
      framework,
      darkMode: true,
    }
  );

  // Ensure output directory exists
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Write files
  const files = {
    'theme.css': output.css,
    'tailwind-theme.css': output.files['tailwind-theme.css'],
    'ionic-theme.css': output.files['ionic-theme.css'],
    'variables.css': output.files['variables.css'],
  };

  for (const [filename, content] of Object.entries(files)) {
    if (content) {
      const filepath = join(outDir, filename);
      writeFileSync(filepath, content);
      console.log(`  Written: ${filepath}`);
    }
  }

  console.log('\nDone! Theme files generated successfully.');
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    // Read version from package.json at runtime
    console.log('0.1.0');
    process.exit(0);
  }

  if (command === 'sync') {
    await sync(args.slice(1));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
