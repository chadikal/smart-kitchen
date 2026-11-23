export type DraftIngredient = {
  id: string;
  name: string;
  quantity: string;
  unit: MeasuredUnit;
  toTaste: boolean;
};

export const measuredUnits = ['MILLIGRAM', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'TEASPOON', 'TABLESPOON', 'CUP', 'PIECE'] as const;
export type MeasuredUnit = (typeof measuredUnits)[number];

function asciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  }).replace('٫', '.');
}

export type DraftStep = {
  id: string;
  instruction: string;
};

export type RecipeDraft = {
  id: string;
  language: 'en' | 'ar';
  title: string;
  description: string;
  prepMinutes: string;
  cookMinutes: string;
  servings: string;
  ingredients: DraftIngredient[];
  steps: DraftStep[];
  updatedAt: string;
  /** Local file URI, data URL, or bundled savora-draft URI. Omitted on older drafts. */
  photoUri?: string | null;
};

export function cleanDraft(draft: RecipeDraft): RecipeDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    prepMinutes: draft.prepMinutes.trim(),
    cookMinutes: draft.cookMinutes.trim(),
    servings: draft.servings.trim(),
    ingredients: draft.ingredients.map((line) => ({ ...line, name: line.name.trim(), quantity: line.toTaste ? '' : asciiDigits(line.quantity.trim()) }))
      .filter((line) => line.name || line.quantity),
    steps: draft.steps.map((step) => ({ ...step, instruction: step.instruction.trim() }))
      .filter((step) => step.instruction),
    photoUri: typeof draft.photoUri === 'string' && draft.photoUri.trim() ? draft.photoUri.trim() : null,
  };
}

export function draftError(draft: RecipeDraft): 'title' | 'ingredient' | 'measurement' | 'step' | 'number' | null {
  if (!draft.title.trim()) return 'title';
  if (!draft.ingredients.some((line) => line.name.trim())) return 'ingredient';
  if (draft.ingredients.some((line) => !line.name.trim())) return 'ingredient';
  if (draft.ingredients.some((line) => !line.toTaste && (!/^(?:\d{1,9})(?:\.\d{1,3})?$/.test(line.quantity.trim()) || Number(line.quantity) <= 0))) return 'measurement';
  if (!draft.steps.some((step) => step.instruction.trim())) return 'step';
  if ([draft.prepMinutes, draft.cookMinutes, draft.servings].some((value) =>
    value.trim() !== '' && (!/^\d+$/.test(value.trim()) || Number(value) > 10080))) return 'number';
  if (draft.servings.trim() !== '' && Number(draft.servings.trim()) < 1) return 'number';
  return null;
}

export function readDrafts(raw: string | null): RecipeDraft[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is RecipeDraft => {
      if (!item || typeof item !== 'object') return false;
      const draft = item as Partial<RecipeDraft>;
      return typeof draft.id === 'string' && typeof draft.title === 'string'
        && (draft.language === 'en' || draft.language === 'ar')
        && Array.isArray(draft.ingredients) && draft.ingredients.every((line: unknown) => {
          if (!line || typeof line !== 'object') return false;
          const entry = line as Partial<DraftIngredient>;
          return typeof entry.id === 'string' && typeof entry.name === 'string'
            && typeof entry.quantity === 'string' && measuredUnits.includes(entry.unit as MeasuredUnit)
            && typeof entry.toTaste === 'boolean';
        })         && Array.isArray(draft.steps)
        && typeof draft.updatedAt === 'string'
        && (draft.photoUri === undefined || draft.photoUri === null || typeof draft.photoUri === 'string');
    });
  } catch {
    return [];
  }
}

export function upsertDraft(drafts: readonly RecipeDraft[], draft: RecipeDraft): RecipeDraft[] {
  return [draft, ...drafts.filter((item) => item.id !== draft.id)];
}
