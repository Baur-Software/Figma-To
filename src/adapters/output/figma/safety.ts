/**
 * Source Safety Checks
 *
 * Prevents accidental overwrites of source Figma files.
 */

import type { ThemeFile } from '../../../schema/tokens.js';
import type { FigmaOutputAdapterOptions, SourceCheckResult, PluginStatus } from './types.js';
import { SourceOverwriteError } from './types.js';

/**
 * Check if the target file matches the source file
 * and if overwriting is allowed.
 *
 * @throws SourceOverwriteError if same file and overwrite not allowed
 */
export function checkSourceSafety(
  theme: ThemeFile,
  options: FigmaOutputAdapterOptions
): SourceCheckResult {
  const sourceFileKey = theme.meta?.figmaFileKey;
  const targetFileKey = options.targetFileKey;
  const allowOverwrite = options.allowSourceOverwrite ?? false;

  const result: SourceCheckResult = {
    sourceFileKey,
    targetFileKey,
    isSameFile: false,
    overwriteAllowed: allowOverwrite,
  };

  // If no source or target, we can't determine if same file
  if (!sourceFileKey || !targetFileKey) {
    return result;
  }

  result.isSameFile = sourceFileKey === targetFileKey;

  // Throw error if same file and overwrite not explicitly allowed
  if (result.isSameFile && !allowOverwrite) {
    throw new SourceOverwriteError(sourceFileKey, targetFileKey);
  }

  return result;
}

/**
 * Check if the currently open Figma file matches the source file
 *
 * @throws SourceOverwriteError if same file and overwrite not allowed
 */
export function checkPluginSafety(
  theme: ThemeFile,
  pluginStatus: PluginStatus,
  options: FigmaOutputAdapterOptions
): SourceCheckResult {
  const sourceFileKey = theme.meta?.figmaFileKey;
  const targetFileKey = pluginStatus.fileKey;
  const allowOverwrite = options.allowSourceOverwrite ?? false;

  const result: SourceCheckResult = {
    sourceFileKey,
    targetFileKey,
    isSameFile: false,
    overwriteAllowed: allowOverwrite,
  };

  // If no source or target, we can't determine if same file
  if (!sourceFileKey || !targetFileKey) {
    return result;
  }

  result.isSameFile = sourceFileKey === targetFileKey;

  // Throw error if same file and overwrite not explicitly allowed
  if (result.isSameFile && !allowOverwrite) {
    throw new SourceOverwriteError(sourceFileKey, targetFileKey);
  }

  return result;
}
