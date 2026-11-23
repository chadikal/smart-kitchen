import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AccountButton, AccountField, AccountFields, AccountIntro, AccountNotice } from '@/components/AccountForm';
import { AppText } from '@/components/AppText';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Screen } from '@/components/Screen';
import { useSession } from '@/src/auth/session-provider';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { colors } from '@/src/theme/tokens';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const session = useSession();
  const { language } = useAppLanguage();
  const suggested = typeof params.name === 'string' ? params.name : '';
  const [name, setName] = useState(session.profile?.displayName ?? suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const finish = async (keepName: boolean) => {
    setBusy(true);
    setError(false);
    const saved = await session.saveProfile(keepName
      ? { displayName: name.trim() || null, language, welcomeCompleted: true }
      : { language, welcomeCompleted: true });
    setBusy(false);
    if (!saved) {
      setError(true);
      return;
    }
    router.replace('/');
  };

  if (session.status === 'loading') {
    return <Screen><AccountNotice>{t('account.loading')}</AccountNotice></Screen>;
  }
  if (session.status !== 'signed-in') {
    return <Screen><AccountNotice>{t('account.welcomeSignedOut')}</AccountNotice></Screen>;
  }

  return (
    <Screen>
      <AccountIntro title={t('account.welcomeTitle')} body={t('account.welcomeBody')} />
      <AccountFields>
        <AccountField label={t('account.displayName')} value={name} onChangeText={setName} editable={!busy} />
      </AccountFields>
      <LanguageSelector label={t('profile.language')} english={t('language.english')} arabic={t('language.arabic')} />
      {error ? <AppText role="body" color={colors.sage}>{t('account.errors.generic')}</AppText> : null}
      <AccountButton label={t('account.startExploring')} busy={busy} onPress={() => void finish(true)} />
      <AccountButton label={t('account.skip')} tone="card" disabled={busy} onPress={() => void finish(false)} />
    </Screen>
  );
}
