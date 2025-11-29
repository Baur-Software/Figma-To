/**
 * Transformation Report
 *
 * Tracks statistics, warnings, and skipped tokens during
 * Figma output transformation.
 */

import type {
  TransformationReport,
  TransformationStats,
  TransformationWarning,
  SkippedToken,
  SourceCheckResult,
  WarningCode,
} from './types.js';
import type { TokenType } from '../../../schema/tokens.js';

/**
 * Builder for transformation reports
 */
export class TransformationReportBuilder implements TransformationReport {
  stats: TransformationStats = {
    collectionsCreated: 0,
    modesCreated: 0,
    variablesCreated: 0,
    valuesSet: 0,
    skipped: 0,
    warnings: 0,
  };

  skipped: SkippedToken[] = [];
  warnings: TransformationWarning[] = [];
  sourceCheck: SourceCheckResult = {
    isSameFile: false,
    overwriteAllowed: false,
  };

  /**
   * Record a created collection
   */
  addCollection(): void {
    this.stats.collectionsCreated++;
  }

  /**
   * Record a created mode
   */
  addMode(): void {
    this.stats.modesCreated++;
  }

  /**
   * Record a created variable
   */
  addVariable(): void {
    this.stats.variablesCreated++;
  }

  /**
   * Record a set value
   */
  addValue(): void {
    this.stats.valuesSet++;
  }

  /**
   * Record a skipped token
   */
  addSkipped(
    path: string,
    reason: string,
    originalType: TokenType,
    suggestion?: string
  ): void {
    this.stats.skipped++;
    this.skipped.push({ path, reason, originalType, suggestion });
  }

  /**
   * Record a warning
   */
  addWarning(code: WarningCode, message: string, path?: string): void {
    this.stats.warnings++;
    this.warnings.push({ code, message, path });
  }

  /**
   * Set source check result
   */
  setSourceCheck(
    sourceFileKey: string | undefined,
    targetFileKey: string | undefined,
    overwriteAllowed: boolean
  ): void {
    this.sourceCheck = {
      sourceFileKey,
      targetFileKey,
      isSameFile: sourceFileKey !== undefined &&
        targetFileKey !== undefined &&
        sourceFileKey === targetFileKey,
      overwriteAllowed,
    };
  }

  /**
   * Format report as human-readable string
   */
  toString(): string {
    const lines: string[] = [];

    lines.push('=== Figma Output Transformation Report ===');
    lines.push('');
    lines.push('Statistics:');
    lines.push(`  Collections: ${this.stats.collectionsCreated}`);
    lines.push(`  Modes: ${this.stats.modesCreated}`);
    lines.push(`  Variables: ${this.stats.variablesCreated}`);
    lines.push(`  Values Set: ${this.stats.valuesSet}`);
    lines.push(`  Skipped: ${this.stats.skipped}`);
    lines.push(`  Warnings: ${this.stats.warnings}`);

    if (this.sourceCheck.isSameFile) {
      lines.push('');
      lines.push('Source Check:');
      lines.push(`  Source file: ${this.sourceCheck.sourceFileKey}`);
      lines.push(`  Target file: ${this.sourceCheck.targetFileKey}`);
      lines.push(`  Same file: YES`);
      lines.push(`  Overwrite allowed: ${this.sourceCheck.overwriteAllowed ? 'YES' : 'NO'}`);
    }

    if (this.skipped.length > 0) {
      lines.push('');
      lines.push('Skipped Tokens:');
      for (const item of this.skipped) {
        lines.push(`  [${item.originalType}] ${item.path}`);
        lines.push(`    Reason: ${item.reason}`);
        if (item.suggestion) {
          lines.push(`    Suggestion: ${item.suggestion}`);
        }
      }
    }

    if (this.warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      for (const warning of this.warnings) {
        const pathSuffix = warning.path ? ` (${warning.path})` : '';
        lines.push(`  [${warning.code}] ${warning.message}${pathSuffix}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get report as JSON object
   */
  toJSON(): object {
    return {
      stats: this.stats,
      skipped: this.skipped,
      warnings: this.warnings,
      sourceCheck: this.sourceCheck,
    };
  }
}

/**
 * Create a new transformation report builder
 */
export function createReport(): TransformationReportBuilder {
  return new TransformationReportBuilder();
}
