import { readAccountProfile, type AccountProfile } from '../auth/profile-client.ts';
import {
  demoProfileEmail,
  demoProfileId,
  demoProfileKey,
  demoProfileNames,
  demoProfilePreferences,
} from './seed.ts';

export { demoProfileEmail, demoProfileKey };

export function demoAccountProfile(language: 'en' | 'ar'): AccountProfile {
  return {
    id: demoProfileId,
    ...demoProfileNames[language],
    displayName: null,
    language,
    welcomeCompleted: true,
    dietaryPreferences: [...demoProfilePreferences.dietaryPreferences],
    cuisineInterests: [...demoProfilePreferences.cuisineInterests],
    countryInterests: [...demoProfilePreferences.countryInterests],
  };
}

/** Keep a typed name. Swap Maya’s seed name when the interface language changes. */
export function localizeDemoProfile(profile: AccountProfile, language: 'en' | 'ar'): AccountProfile {
  const seeded = (Object.keys(demoProfileNames) as (keyof typeof demoProfileNames)[]).some((code) =>
    profile.firstName === demoProfileNames[code].firstName && profile.lastName === demoProfileNames[code].lastName);
  return {
    ...profile,
    ...(seeded ? demoProfileNames[language] : {}),
    language,
  };
}

export function loadDemoProfile(language: 'en' | 'ar'): AccountProfile {
  const seed = demoAccountProfile(language);
  const storage = globalThis.localStorage;
  if (!storage) return seed;
  const raw = storage.getItem(demoProfileKey);
  if (raw == null) return seed;
  try {
    const parsed = readAccountProfile(JSON.parse(raw));
    if (!parsed || parsed.id !== demoProfileId) return seed;
    return localizeDemoProfile({ ...parsed, welcomeCompleted: true }, language);
  } catch {
    return seed;
  }
}

export function storeDemoProfile(profile: AccountProfile): void {
  globalThis.localStorage?.setItem(demoProfileKey, JSON.stringify(profile));
}
