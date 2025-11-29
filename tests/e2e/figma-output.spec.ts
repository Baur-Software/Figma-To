/**
 * Figma Output Adapter E2E Tests
 */

import { test, expect } from '@playwright/test';
import {
  FigmaOutputAdapter,
  createFigmaOutputAdapter,
  transformToFigmaVariables,
  resetIdCounter,
  TransformationReportBuilder,
  checkSourceSafety,
  SourceOverwriteError,
} from '../../src/adapters/output/figma/index.js';
import type { ThemeFile } from '../../src/schema/tokens.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMinimalTheme = (): ThemeFile => ({
  name: 'Test Theme',
  collections: [
    {
      name: 'primitives',
      modes: ['default'],
      defaultMode: 'default',
      tokens: {
        default: {
          color: {
            red: {
              $type: 'color',
              $value: { r: 1, g: 0, b: 0, a: 1 },
            },
            blue: {
              $type: 'color',
              $value: { r: 0, g: 0, b: 1, a: 1 },
            },
          },
        },
      },
    },
  ],
});

const createMultiModeTheme = (): ThemeFile => ({
  name: 'Multi-Mode Theme',
  collections: [
    {
      name: 'colors',
      modes: ['light', 'dark'],
      defaultMode: 'light',
      tokens: {
        light: {
          background: {
            $type: 'color',
            $value: { r: 1, g: 1, b: 1, a: 1 },
            $description: 'Background color for light mode',
          },
          text: {
            $type: 'color',
            $value: { r: 0, g: 0, b: 0, a: 1 },
          },
        },
        dark: {
          background: {
            $type: 'color',
            $value: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            $description: 'Background color for dark mode',
          },
          text: {
            $type: 'color',
            $value: { r: 1, g: 1, b: 1, a: 1 },
          },
        },
      },
    },
  ],
});

const createMixedTypesTheme = (): ThemeFile => ({
  name: 'Mixed Types Theme',
  collections: [
    {
      name: 'tokens',
      modes: ['default'],
      defaultMode: 'default',
      tokens: {
        default: {
          color: {
            primary: {
              $type: 'color',
              $value: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
            },
          },
          spacing: {
            small: {
              $type: 'dimension',
              $value: { value: 8, unit: 'px' },
            },
            large: {
              $type: 'dimension',
              $value: { value: 32, unit: 'rem' },
            },
          },
          text: {
            heading: {
              $type: 'string',
              $value: 'Heading Text',
            },
          },
          count: {
            max: {
              $type: 'number',
              $value: 100,
            },
          },
          flag: {
            enabled: {
              $type: 'boolean',
              $value: true,
            },
          },
          font: {
            family: {
              $type: 'fontFamily',
              $value: ['Inter', 'sans-serif'],
            },
            weight: {
              $type: 'fontWeight',
              $value: 'bold',
            },
          },
          timing: {
            duration: {
              $type: 'duration',
              $value: { value: 200, unit: 'ms' },
            },
          },
          shadow: {
            card: {
              $type: 'shadow',
              $value: [{ offsetX: { value: 0, unit: 'px' }, offsetY: { value: 4, unit: 'px' }, blur: { value: 8, unit: 'px' }, spread: { value: 0, unit: 'px' }, color: { r: 0, g: 0, b: 0, a: 0.1 } }],
            },
          },
        },
      },
    },
  ],
});

// =============================================================================
// Adapter Tests
// =============================================================================

test.describe('Figma Output Adapter', () => {
  test.describe('Adapter Creation', () => {
    test('createFigmaOutputAdapter creates adapter instance', () => {
      const adapter = createFigmaOutputAdapter();
      expect(adapter).toBeInstanceOf(FigmaOutputAdapter);
      expect(adapter.id).toBe('figma-output');
      expect(adapter.name).toBe('Figma Output Adapter');
    });

    test('adapter can be created with new keyword', () => {
      const adapter = new FigmaOutputAdapter();
      expect(adapter).toBeInstanceOf(FigmaOutputAdapter);
    });
  });

  test.describe('Transform Method', () => {
    test('transforms minimal theme to Figma Variables format', async () => {
      const adapter = createFigmaOutputAdapter();
      const theme = createMinimalTheme();

      const result = await adapter.transform(theme);

      expect(result.requestBody).toBeDefined();
      expect(result.requestBody.variableCollections).toHaveLength(1);
      expect(result.requestBody.variables).toHaveLength(2);
      expect(result.report).toBeDefined();
    });

    test('includes manual instructions in result', async () => {
      const adapter = createFigmaOutputAdapter();
      const theme = createMinimalTheme();

      const result = await adapter.transform(theme, { targetFileKey: 'abc123' });

      const instructions = result.getManualInstructions();
      expect(instructions).toContain('POST https://api.figma.com/v1/files/abc123/variables');
      expect(instructions).toContain('X-Figma-Token');
    });

    test('does not include execute method without write client', async () => {
      const adapter = createFigmaOutputAdapter();
      const theme = createMinimalTheme();

      const result = await adapter.transform(theme);

      expect(result.execute).toBeUndefined();
    });
  });
});

// =============================================================================
// Transformer Tests
// =============================================================================

test.describe('Figma Variable Transformer', () => {
  test.beforeEach(() => {
    resetIdCounter();
  });

  test.describe('Collection Generation', () => {
    test('creates collection with correct name', () => {
      const theme = createMinimalTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      expect(requestBody.variableCollections![0].name).toBe('primitives');
      expect(requestBody.variableCollections![0].action).toBe('CREATE');
    });

    test('creates collection with mapped name when provided', () => {
      const theme = createMinimalTheme();
      const { requestBody } = transformToFigmaVariables(theme, {
        collectionMapping: { primitives: 'Design Tokens' },
      });

      expect(requestBody.variableCollections![0].name).toBe('Design Tokens');
    });

    test('generates temporary IDs with prefix', () => {
      const theme = createMinimalTheme();
      const { requestBody } = transformToFigmaVariables(theme, { idPrefix: 'test' });

      expect(requestBody.variableCollections![0].id).toMatch(/^test_col_\d+$/);
      expect(requestBody.variables![0].id).toMatch(/^test_var_\d+$/);
    });
  });

  test.describe('Mode Generation', () => {
    test('creates modes for multi-mode collections', () => {
      const theme = createMultiModeTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      // Should have 1 additional mode (dark) - light is the initial mode
      expect(requestBody.variableModes).toHaveLength(1);
      expect(requestBody.variableModes![0].name).toBe('dark');
    });

    test('sets mode values for each mode', () => {
      const theme = createMultiModeTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      // 2 variables * 2 modes = 4 mode values
      expect(requestBody.variableModeValues).toHaveLength(4);
    });
  });

  test.describe('Variable Generation', () => {
    test('creates variables with correct names', () => {
      const theme = createMinimalTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      const names = requestBody.variables!.map(v => v.name);
      expect(names).toContain('color/red');
      expect(names).toContain('color/blue');
    });

    test('preserves token descriptions', () => {
      const theme = createMultiModeTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      const bgVar = requestBody.variables!.find(v => v.name === 'background');
      expect(bgVar?.description).toBe('Background color for light mode');
    });
  });

  test.describe('Value Conversion', () => {
    test('converts colors to RGBA format', () => {
      const theme = createMinimalTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      const redValue = requestBody.variableModeValues!.find(
        v => requestBody.variables!.find(vr => vr.id === v.variableId)?.name === 'color/red'
      );

      expect(redValue?.value).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    test('converts dimensions to numbers', () => {
      const theme = createMixedTypesTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      const smallValue = requestBody.variableModeValues!.find(
        v => requestBody.variables!.find(vr => vr.id === v.variableId)?.name === 'spacing/small'
      );

      expect(smallValue?.value).toBe(8);
    });

    test('converts font weight keywords to numbers', () => {
      const theme = createMixedTypesTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      const weightValue = requestBody.variableModeValues!.find(
        v => requestBody.variables!.find(vr => vr.id === v.variableId)?.name === 'font/weight'
      );

      expect(weightValue?.value).toBe(700); // 'bold' = 700
    });

    test('truncates font family stacks to first family', () => {
      const theme = createMixedTypesTheme();
      const { requestBody, report } = transformToFigmaVariables(theme);

      const familyValue = requestBody.variableModeValues!.find(
        v => requestBody.variables!.find(vr => vr.id === v.variableId)?.name === 'font/family'
      );

      expect(familyValue?.value).toBe('Inter');
      expect(report.warnings.some(w => w.code === 'VALUE_TRUNCATED')).toBe(true);
    });

    test('converts duration to milliseconds', () => {
      const theme = createMixedTypesTheme();
      const { requestBody } = transformToFigmaVariables(theme);

      const durationValue = requestBody.variableModeValues!.find(
        v => requestBody.variables!.find(vr => vr.id === v.variableId)?.name === 'timing/duration'
      );

      expect(durationValue?.value).toBe(200);
    });
  });

  test.describe('Skipped Tokens', () => {
    test('skips composite types like shadow', () => {
      const theme = createMixedTypesTheme();
      const { report } = transformToFigmaVariables(theme);

      const skippedShadow = report.skipped.find(s => s.path.includes('shadow') && s.path.includes('card'));
      expect(skippedShadow).toBeDefined();
      expect(skippedShadow?.reason).toContain('not supported');
    });

    test('reports skipped count in stats', () => {
      const theme = createMixedTypesTheme();
      const { report } = transformToFigmaVariables(theme);

      expect(report.stats.skipped).toBeGreaterThan(0);
    });
  });

  test.describe('Warnings', () => {
    test('warns when non-px units are discarded', () => {
      const theme = createMixedTypesTheme();
      const { report } = transformToFigmaVariables(theme);

      const unitWarning = report.warnings.find(
        w => w.code === 'UNIT_DISCARDED' && w.path?.includes('large')
      );
      expect(unitWarning).toBeDefined();
      expect(unitWarning?.message).toContain('rem');
    });
  });
});

// =============================================================================
// Safety Check Tests
// =============================================================================

test.describe('Source Safety Checks', () => {
  test('allows different source and target files', () => {
    const theme: ThemeFile = {
      name: 'Test',
      meta: { figmaFileKey: 'source123' },
      collections: [],
    };

    const result = checkSourceSafety(theme, { targetFileKey: 'target456' });

    expect(result.isSameFile).toBe(false);
    expect(result.sourceFileKey).toBe('source123');
    expect(result.targetFileKey).toBe('target456');
  });

  test('throws SourceOverwriteError when same file without permission', () => {
    const theme: ThemeFile = {
      name: 'Test',
      meta: { figmaFileKey: 'same123' },
      collections: [],
    };

    expect(() => {
      checkSourceSafety(theme, { targetFileKey: 'same123' });
    }).toThrow(SourceOverwriteError);
  });

  test('allows same file with explicit permission', () => {
    const theme: ThemeFile = {
      name: 'Test',
      meta: { figmaFileKey: 'same123' },
      collections: [],
    };

    const result = checkSourceSafety(theme, {
      targetFileKey: 'same123',
      allowSourceOverwrite: true,
    });

    expect(result.isSameFile).toBe(true);
    expect(result.overwriteAllowed).toBe(true);
  });

  test('handles missing source file key', () => {
    const theme: ThemeFile = {
      name: 'Test',
      collections: [],
    };

    const result = checkSourceSafety(theme, { targetFileKey: 'target123' });

    expect(result.isSameFile).toBe(false);
    expect(result.sourceFileKey).toBeUndefined();
  });

  test('handles missing target file key', () => {
    const theme: ThemeFile = {
      name: 'Test',
      meta: { figmaFileKey: 'source123' },
      collections: [],
    };

    const result = checkSourceSafety(theme, {});

    expect(result.isSameFile).toBe(false);
    expect(result.targetFileKey).toBeUndefined();
  });
});

// =============================================================================
// Report Builder Tests
// =============================================================================

test.describe('Transformation Report Builder', () => {
  test('tracks statistics correctly', () => {
    const report = new TransformationReportBuilder();

    report.addCollection();
    report.addCollection();
    report.addMode();
    report.addVariable();
    report.addVariable();
    report.addVariable();
    report.addValue();
    report.addValue();

    expect(report.stats.collectionsCreated).toBe(2);
    expect(report.stats.modesCreated).toBe(1);
    expect(report.stats.variablesCreated).toBe(3);
    expect(report.stats.valuesSet).toBe(2);
  });

  test('tracks skipped tokens', () => {
    const report = new TransformationReportBuilder();

    report.addSkipped('path/to/token', 'Not supported', 'shadow', 'Use styles instead');

    expect(report.stats.skipped).toBe(1);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0]).toEqual({
      path: 'path/to/token',
      reason: 'Not supported',
      originalType: 'shadow',
      suggestion: 'Use styles instead',
    });
  });

  test('tracks warnings', () => {
    const report = new TransformationReportBuilder();

    report.addWarning('UNIT_DISCARDED', 'Unit rem discarded', 'spacing/large');

    expect(report.stats.warnings).toBe(1);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toEqual({
      code: 'UNIT_DISCARDED',
      message: 'Unit rem discarded',
      path: 'spacing/large',
    });
  });

  test('formats report as string', () => {
    const report = new TransformationReportBuilder();
    report.addCollection();
    report.addVariable();
    report.addWarning('UNIT_DISCARDED', 'Test warning');

    const str = report.toString();

    expect(str).toContain('Figma Output Transformation Report');
    expect(str).toContain('Collections: 1');
    expect(str).toContain('Variables: 1');
    expect(str).toContain('UNIT_DISCARDED');
  });

  test('exports report as JSON', () => {
    const report = new TransformationReportBuilder();
    report.addCollection();

    const json = report.toJSON();

    expect(json).toHaveProperty('stats');
    expect(json).toHaveProperty('skipped');
    expect(json).toHaveProperty('warnings');
    expect(json).toHaveProperty('sourceCheck');
  });

  test('sets source check result', () => {
    const report = new TransformationReportBuilder();

    report.setSourceCheck('source123', 'target456', false);

    expect(report.sourceCheck.sourceFileKey).toBe('source123');
    expect(report.sourceCheck.targetFileKey).toBe('target456');
    expect(report.sourceCheck.isSameFile).toBe(false);
    expect(report.sourceCheck.overwriteAllowed).toBe(false);
  });

  test('detects same file in source check', () => {
    const report = new TransformationReportBuilder();

    report.setSourceCheck('same123', 'same123', true);

    expect(report.sourceCheck.isSameFile).toBe(true);
  });
});
