import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { directionFor, localizeDigits, resolveLanguage, textAlignFor } from './languages.ts';

describe('localizeDigits', () => {
  it('uses Arabic digits for amounts, times, servings, and steps', () => {
    assert.equal(localizeDigits('1200 غ · 95 د · 4 · 123', 'ar'), '١٢٠٠ غ · ٩٥ د · ٤ · ١٢٣');
    assert.equal(localizeDigits(0, 'ar'), '٠');
  });

  it('preserves exact decimal digits and existing Arabic numerals', () => {
    assert.equal(localizeDigits('1.005', 'ar'), '١.٠٠٥');
    assert.equal(localizeDigits('999999999999999999.001', 'ar'), '٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩٩.٠٠١');
    assert.equal(localizeDigits('٢٠٠ درجة', 'ar'), '٢٠٠ درجة');
  });

  it('leaves English display unchanged', () => {
    assert.equal(localizeDigits('1200 g · 1.005 · 95 min', 'en'), '1200 g · 1.005 · 95 min');
  });
});

describe('resolveLanguage', () => {
  it('selects Arabic for Arabic language codes', () => {
    assert.equal(resolveLanguage('ar'), 'ar');
    assert.equal(resolveLanguage('ar-LB'), 'ar');
  });

  it('falls back to English for other languages', () => {
    assert.equal(resolveLanguage('en'), 'en');
    assert.equal(resolveLanguage('en-US'), 'en');
    assert.equal(resolveLanguage('fr'), 'en');
    assert.equal(resolveLanguage(null), 'en');
    assert.equal(resolveLanguage(undefined), 'en');
  });
});

describe('directionFor', () => {
  it('uses right-to-left layout for Arabic', () => {
    assert.equal(directionFor('ar'), 'rtl');
  });

  it('uses left-to-right layout for English', () => {
    assert.equal(directionFor('en'), 'ltr');
  });
});

describe('textAlignFor', () => {
  it('uses physical alignment on web', () => {
    assert.equal(textAlignFor('rtl', 'web'), 'right');
    assert.equal(textAlignFor('ltr', 'web'), 'left');
  });

  it('lets native paragraph text resolve start once', () => {
    assert.equal(textAlignFor('rtl', 'native-text'), 'left');
    assert.equal(textAlignFor('ltr', 'native-text'), 'left');
  });

  it('keeps physical alignment for native text inputs', () => {
    assert.equal(textAlignFor('rtl', 'native-input'), 'right');
    assert.equal(textAlignFor('ltr', 'native-input'), 'left');
  });
});
