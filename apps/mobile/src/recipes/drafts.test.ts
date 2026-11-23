import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanDraft, draftError, readDrafts, upsertDraft, type RecipeDraft } from './drafts.ts';

const draft: RecipeDraft = {
  id: 'one', language: 'en', title: ' Cake ', description: ' Simple ',
  prepMinutes: '20', cookMinutes: '40', servings: '8',
  ingredients: [{ id: 'a', name: ' Flour ', quantity: ' 250.000 ', unit: 'GRAM', toTaste: false }, { id: 'b', name: '', quantity: '', unit: 'GRAM', toTaste: false }],
  steps: [{ id: 's', instruction: ' Mix. ' }, { id: 't', instruction: '' }],
  updatedAt: '2026-11-16T00:00:00.000Z',
};

test('drafts keep original language and clean empty lines', () => {
  const cleaned = cleanDraft(draft);
  assert.equal(cleaned.title, 'Cake');
  assert.equal(cleaned.language, 'en');
  assert.deepEqual(cleaned.ingredients.map((line) => line.name), ['Flour']);
  assert.equal(cleaned.ingredients[0].quantity, '250.000');
  assert.deepEqual(cleaned.steps.map((step) => step.instruction), ['Mix.']);
  assert.equal(draftError(cleaned), null);
});

test('drafts require a title, ingredient, step, and valid servings', () => {
  const cleaned = cleanDraft(draft);
  assert.equal(draftError({ ...cleaned, title: ' ' }), 'title');
  assert.equal(draftError({ ...cleaned, ingredients: [] }), 'ingredient');
  assert.equal(draftError({ ...cleaned, steps: [] }), 'step');
  assert.equal(draftError({ ...cleaned, servings: '00' }), 'number');
  assert.equal(draftError({ ...cleaned, ingredients: [{ id: 'x', name: 'Salt', quantity: '', unit: 'GRAM', toTaste: true }] }), null);
  assert.equal(draftError({ ...cleaned, ingredients: [{ id: 'x', name: 'Flour', quantity: '0', unit: 'GRAM', toTaste: false }] }), 'measurement');
  assert.equal(cleanDraft({ ...cleaned, ingredients: [{ id: 'x', name: 'Flour', quantity: '٢٥٠٫٥', unit: 'GRAM', toTaste: false }] }).ingredients[0].quantity, '250.5');
});

test('older drafts without a photo still load, and a photo can be cleared', () => {
  const raw = JSON.stringify([{ ...draft, title: 'Cake', photoUri: undefined }]);
  assert.equal(readDrafts(raw)[0]?.title, 'Cake');
  assert.equal(cleanDraft({ ...draft, photoUri: '  file://photo.jpg  ' }).photoUri, 'file://photo.jpg');
  assert.equal(cleanDraft({ ...draft, photoUri: '   ' }).photoUri, null);
  assert.deepEqual(readDrafts(JSON.stringify([{ ...draft, photoUri: 4 }])), []);
});

test('upsert edits a draft without duplicating it', () => {
  const updated = { ...draft, title: 'New title' };
  assert.deepEqual(upsertDraft([draft], updated), [updated]);
  assert.deepEqual(readDrafts(JSON.stringify([updated])), [updated]);
});
