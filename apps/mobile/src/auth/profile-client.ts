export type AccountProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  language: 'en' | 'ar' | null;
  welcomeCompleted: boolean;
  dietaryPreferences: string[];
  cuisineInterests: string[];
  countryInterests: string[];
};

export type ProfilePatch = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  language?: 'en' | 'ar';
  welcomeCompleted?: true;
  dietaryPreferences?: string[];
  cuisineInterests?: string[];
  countryInterests?: string[];
};

export type ProfileResult =
  | { status: 'ok'; profile: AccountProfile }
  | { status: 'unauthorized' }
  | { status: 'error' };

export function profileHeading(profile: Pick<AccountProfile, 'firstName' | 'lastName' | 'displayName'>): string | null {
  const first = profile.firstName?.trim() ?? '';
  const last = profile.lastName?.trim() ?? '';
  if (first || last) return [first, last].filter(Boolean).join(' ');
  const legacy = profile.displayName?.trim() ?? '';
  return legacy.length > 0 ? legacy : null;
}

function optionalName(item: Record<string, unknown>, key: string): string | null | undefined {
  if (!(key in item)) return null;
  const value = item[key];
  if (value === null || typeof value === 'string') return value;
  return undefined;
}

function optionalSlugList(item: Record<string, unknown>, key: string): string[] | null {
  if (!(key in item)) return [];
  return readSlugList(item[key]);
}

function readSlugList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) return null;
    items.push(item);
  }
  return items;
}

export function readAccountProfile(value: unknown): AccountProfile | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || item.id.length === 0) return null;
  const firstName = optionalName(item, 'firstName');
  const lastName = optionalName(item, 'lastName');
  if (firstName === undefined || lastName === undefined) return null;
  if (!(item.displayName === null || typeof item.displayName === 'string')) return null;
  if (!(item.language === null || item.language === 'en' || item.language === 'ar')) return null;
  if (typeof item.welcomeCompleted !== 'boolean') return null;
  const dietaryPreferences = optionalSlugList(item, 'dietaryPreferences');
  const cuisineInterests = optionalSlugList(item, 'cuisineInterests');
  const countryInterests = optionalSlugList(item, 'countryInterests');
  if (!dietaryPreferences || !cuisineInterests || !countryInterests) return null;
  return {
    id: item.id,
    firstName,
    lastName,
    displayName: item.displayName,
    language: item.language,
    welcomeCompleted: item.welcomeCompleted,
    dietaryPreferences,
    cuisineInterests,
    countryInterests,
  };
}

export async function requestAccountProfile(
  baseUrl: string,
  accessToken: string,
  init: { method?: 'GET' | 'PATCH'; body?: unknown; signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<ProfileResult> {
  const fetchImpl = init.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/account`, {
      method: init.method ?? 'GET',
      signal: init.signal,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { status: 'error' };
  }
  if (response.status === 401) return { status: 'unauthorized' };
  if (!response.ok) return { status: 'error' };
  const profile = readAccountProfile(await response.json());
  return profile ? { status: 'ok', profile } : { status: 'error' };
}
