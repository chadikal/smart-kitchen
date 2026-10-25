import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { directionFor, resolveLanguage, textAlignFor } from './languages.ts';

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
