import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { directionFor, resolveLanguage } from './languages.ts';

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
