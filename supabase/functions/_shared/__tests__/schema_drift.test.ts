// Cross-boundary drift guard. The mobile app hand-duplicates the edge-function schema
// (mobile/src/types/scan.ts) because Metro won't bundle files outside the Expo root
// (see the note atop that file). If the two drift, the client and server disagree about
// the wire contract — a silent, nasty class of bug. This test fails loudly on drift.
import {
  CategorySchema as EdgeCategory,
  ConditionGradeSchema as EdgeCondition,
  VerdictSchema as EdgeVerdict,
  IdentifiedSchema as EdgeIdentified,
  CompsSchema as EdgeComps,
  ScanResultSchema as EdgeResult,
  ScanErrorSchema as EdgeError,
} from '../schema.ts';
import {
  CategorySchema as AppCategory,
  ConditionGradeSchema as AppCondition,
  VerdictSchema as AppVerdict,
  IdentifiedSchema as AppIdentified,
  CompsSchema as AppComps,
  ScanResultSchema as AppResult,
  ScanErrorSchema as AppError,
} from '../../../../mobile/src/types/scan.ts';
import type { ZodTypeAny } from 'zod';

// zod enums expose their members on `.options`.
function enumValues(schema: { options: readonly string[] }): string[] {
  return [...schema.options].sort();
}
// zod objects expose their field names on `.shape`.
function objectKeys(schema: { shape: Record<string, ZodTypeAny> }): string[] {
  return Object.keys(schema.shape).sort();
}

describe('schema drift: mobile app vs edge function', () => {
  it('CategorySchema enums match', () => {
    expect(enumValues(AppCategory)).toEqual(enumValues(EdgeCategory));
  });
  it('ConditionGradeSchema enums match', () => {
    expect(enumValues(AppCondition)).toEqual(enumValues(EdgeCondition));
  });
  it('VerdictSchema enums match', () => {
    expect(enumValues(AppVerdict)).toEqual(enumValues(EdgeVerdict));
  });
  it('IdentifiedSchema fields match', () => {
    expect(objectKeys(AppIdentified)).toEqual(objectKeys(EdgeIdentified));
  });
  it('CompsSchema fields match', () => {
    expect(objectKeys(AppComps)).toEqual(objectKeys(EdgeComps));
  });
  it('ScanResultSchema fields match', () => {
    expect(objectKeys(AppResult)).toEqual(objectKeys(EdgeResult));
  });
  it('ScanErrorSchema error codes match', () => {
    expect(enumValues(AppError.shape.error as unknown as { options: readonly string[] })).toEqual(
      enumValues(EdgeError.shape.error as unknown as { options: readonly string[] }),
    );
  });
});
