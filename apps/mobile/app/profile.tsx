import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AccountButton, AccountField, AccountFields } from '@/components/AccountForm';
import { AccountHeader } from '@/components/AccountHeader';
import { AppText } from '@/components/AppText';
import { LanguageSelector } from '@/components/LanguageSelector';
import { PreferenceChips } from '@/components/PreferenceChips';
import { Screen } from '@/components/Screen';
import { destinationAfterSignIn } from '@/src/auth/callback-url';
import { fetchPreferenceCatalog, toggleSlug } from '@/src/auth/catalog-options';
import { summarizePreferenceSlugs, withPreferenceLabels, type PreferenceLabelKey } from '@/src/auth/preference-labels';
import { profileHeading, type AccountProfile } from '@/src/auth/profile-client';
import { useSession } from '@/src/auth/session-provider';
import type { CatalogOption } from '@/src/catalog/discover';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { colors, radii } from '@/src/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useSession();
  const signedIn = session.status === 'signed-in';
  const profile = session.profile;
  const heading = profile ? profileHeading(profile) : null;
  const profileUnavailable = signedIn && !profile && session.profileError;

  const retryProfile = async () => {
    const next = await session.refreshProfile();
    if (!next) return;
    const destination = destinationAfterSignIn(next);
    if (destination.onboarding === 'required') router.replace(destination.pathname);
  };

  return (
    <Screen includeTopInset>
      <AccountHeader title={t('profile.title')} prominent />
      {session.status === 'loading' ? <AppText role="body">{t('account.loading')}</AppText> : null}
      {profileUnavailable ? (
        <>
          <AppText role="body">{t('account.profileRetry')}</AppText>
          <AccountButton label={t('account.retry')} onPress={() => void retryProfile()} />
        </>
      ) : null}
      {signedIn && profile ? (
        <AppText role="section">{heading ?? t('profile.signedIn')}</AppText>
      ) : null}
      {signedIn || session.status === 'loading' ? null : (
        <>
          <AppText role="body" color={colors.muted}>{t('profile.guest')}</AppText>
          <View style={styles.actions}>
            <AccountButton label={t('account.signIn')} onPress={() => router.push('/account/sign-in')} />
            <AccountButton label={t('account.createAccount')} tone="card" onPress={() => router.push('/account/sign-up')} />
          </View>
        </>
      )}
      {signedIn && profile && !profile.welcomeCompleted ? (
        <AccountButton label={t('account.finishWelcome')} onPress={() => router.push('/account/welcome')} />
      ) : null}
      <View style={styles.language}>
        <AppText role="compactTitle">{t('profile.language')}</AppText>
        <LanguageSelector
          label={t('profile.language')}
          english={t('language.english')}
          arabic={t('language.arabic')}
          onChange={signedIn ? (next) => { void session.saveProfile({ language: next }); } : undefined}
        />
      </View>
      {signedIn && profile ? <SignedInProfile key={profile.id} profile={profile} /> : null}
    </Screen>
  );
}

function SignedInProfile({ profile }: { profile: AccountProfile }) {
  const { t } = useTranslation();
  const session = useSession();
  const { language } = useAppLanguage();
  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [dietary, setDietary] = useState(profile.dietaryPreferences);
  const [cuisines, setCuisines] = useState(profile.cuisineInterests);
  const [countries, setCountries] = useState(profile.countryInterests);
  const [dietaryOptions, setDietaryOptions] = useState<CatalogOption[]>([]);
  const [cuisineOptions, setCuisineOptions] = useState<CatalogOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<CatalogOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const labels = useMemo(() => preferenceLabels(t), [t]);
  const cuisineChoices = useMemo(
    () => withPreferenceLabels(cuisineOptions, labels),
    [cuisineOptions, labels],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetchPreferenceCatalog('dietary-tags', language, controller.signal),
      fetchPreferenceCatalog('cuisines', language, controller.signal),
      fetchPreferenceCatalog('countries', language, controller.signal),
    ]).then(([dietaryTags, cuisineList, countryList]) => {
      if (dietaryTags) setDietaryOptions(dietaryTags);
      if (cuisineList) setCuisineOptions(cuisineList);
      if (countryList) setCountryOptions(countryList);
    });
    return () => controller.abort();
  }, [language]);

  const save = async () => {
    setBusy(true);
    setError(false);
    setSaved(false);
    const result = await session.saveProfile({
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      dietaryPreferences: dietary,
      cuisineInterests: cuisines,
      countryInterests: countries,
      language,
    });
    setBusy(false);
    if (!result) {
      setError(true);
      return;
    }
    setSaved(true);
    setEditing(false);
  };

  const cancelEdit = () => {
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setDietary(profile.dietaryPreferences);
    setCuisines(profile.cuisineInterests);
    setCountries(profile.countryInterests);
    setError(false);
    setEditing(false);
  };

  const empty = t('profile.noneYet');
  const pending = t('profile.preferencesPending');

  return (
    <View style={styles.section}>
      {editing ? (
        <AccountFields>
          <AccountField label={t('account.firstName')} value={firstName} onChangeText={setFirstName} editable={!busy} />
          <AccountField label={t('account.lastName')} value={lastName} onChangeText={setLastName} editable={!busy} />
        </AccountFields>
      ) : null}
      {editing ? (
        <>
          <View style={styles.block}>
            <AppText role="compactTitle">{t('account.dietaryPreferences')}</AppText>
            <AppText role="meta" color={colors.muted}>{t('account.dietaryDisclaimer')}</AppText>
            <PreferenceChips
              options={dietaryOptions}
              selected={dietary}
              disabled={busy}
              onToggle={(slug) => setDietary((current) => toggleSlug(current, slug))}
            />
          </View>
          <View style={styles.block}>
            <AppText role="compactTitle">{t('account.cuisineInterests')}</AppText>
            <PreferenceChips
              options={cuisineChoices}
              selected={cuisines}
              disabled={busy}
              onToggle={(slug) => setCuisines((current) => toggleSlug(current, slug))}
            />
          </View>
          <View style={styles.block}>
            <AppText role="compactTitle">{t('account.countryInterests')}</AppText>
            <PreferenceChips
              options={countryOptions}
              selected={countries}
              disabled={busy}
              onToggle={(slug) => setCountries((current) => toggleSlug(current, slug))}
            />
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <PreferenceSummary
            title={t('account.dietaryPreferences')}
            value={summarizePreferenceSlugs(dietary, dietaryOptions, empty, pending)}
          />
          <PreferenceSummary
            title={t('account.cuisineInterests')}
            value={summarizePreferenceSlugs(cuisines, cuisineChoices, empty, pending)}
          />
          <PreferenceSummary
            title={t('account.countryInterests')}
            value={summarizePreferenceSlugs(countries, countryOptions, empty, pending)}
          />
        </View>
      )}
      {error ? <AppText role="body" color={colors.sage}>{t('account.errors.generic')}</AppText> : null}
      {saved && !editing ? <AppText role="body" color={colors.sage}>{t('profile.saved')}</AppText> : null}
      {editing ? (
        <AccountButton label={t('profile.save')} busy={busy} onPress={() => void save()} />
      ) : (
        <AccountButton label={t('profile.edit')} onPress={() => { setSaved(false); setEditing(true); }} />
      )}
      {editing ? (
        <AccountButton label={t('profile.cancel')} tone="card" disabled={busy} onPress={cancelEdit} />
      ) : null}
      <AccountButton label={t('account.signOut')} tone="card" disabled={busy} onPress={() => void session.signOut()} />
    </View>
  );
}

function PreferenceSummary({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.block}>
      <AppText role="compactTitle">{title}</AppText>
      <AppText role="body" color={colors.muted}>{value}</AppText>
    </View>
  );
}

function preferenceLabels(t: (key: string) => string): Record<PreferenceLabelKey, string> {
  return {
    greekInspired: t('account.preferenceLabels.greekInspired'),
    japaneseInspired: t('account.preferenceLabels.japaneseInspired'),
    chineseInspired: t('account.preferenceLabels.chineseInspired'),
    greek: t('account.preferenceLabels.greek'),
    mediterranean: t('account.preferenceLabels.mediterranean'),
    northAfrican: t('account.preferenceLabels.northAfrican'),
  };
}

const styles = StyleSheet.create({
  actions: { alignSelf: 'stretch', gap: 12 },
  language: { alignSelf: 'stretch', width: '100%', gap: 12 },
  section: { alignSelf: 'stretch', gap: 18 },
  block: { alignSelf: 'stretch', gap: 6 },
  card: {
    alignSelf: 'stretch',
    gap: 14,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
