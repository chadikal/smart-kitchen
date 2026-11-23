export type PublicLanguage = 'en' | 'ar';

export type ProfilePatch = {
  displayName?: string | null;
  language?: PublicLanguage;
  welcomeCompleted?: true;
};

export class ProfileInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileInputError';
  }
}

const fields = new Set(['displayName', 'language', 'welcomeCompleted']);

export function parseProfilePatch(body: unknown): ProfilePatch {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ProfileInputError('Profile update must be an object.');
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!fields.has(key)) throw new ProfileInputError('Unknown profile field.');
  }
  const patch: ProfilePatch = {};
  if ('displayName' in record) patch.displayName = parseDisplayName(record.displayName);
  if ('language' in record) patch.language = parseLanguage(record.language);
  if ('welcomeCompleted' in record) {
    if (record.welcomeCompleted !== true) throw new ProfileInputError('Welcome completion cannot be cleared.');
    patch.welcomeCompleted = true;
  }
  if (Object.keys(patch).length === 0) throw new ProfileInputError('Profile update is empty.');
  return patch;
}

export function parseDisplayName(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new ProfileInputError('Display name must be text.');
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 80 || hasControlCharacter(trimmed)) {
    throw new ProfileInputError('Display name is not valid.');
  }
  return trimmed;
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function parseLanguage(value: unknown): PublicLanguage {
  if (value === 'en' || value === 'ar') return value;
  throw new ProfileInputError('Language must be en or ar.');
}
