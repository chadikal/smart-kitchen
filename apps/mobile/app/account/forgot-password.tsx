import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountButton, AccountField, AccountFields, AccountIntro, AccountNotice } from '@/components/AccountForm';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { classifyAuthError, type AuthErrorKind } from '@/src/auth/auth-errors';
import { authRedirectUrl } from '@/src/auth/redirect';
import { useSession } from '@/src/auth/session-provider';
import { supabaseAuth } from '@/src/auth/supabase';
import { colors } from '@/src/theme/tokens';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const emailReady = session.status !== 'unconfigured';

  const submit = async () => {
    setError(null);
    const supabase = supabaseAuth();
    if (!supabase) {
      setError('generic');
      return;
    }
    setBusy(true);
    try {
      const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() });
      if (result.error && result.error.code !== 'user_not_found') {
        setError(classifyAuthError(result.error));
        return;
      }
      setSent(true);
    } catch (caught) {
      setError(classifyAuthError(caught instanceof Error ? caught : null));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AccountIntro title={t('account.forgotTitle')} body={t('account.resetHelp')} />
      <AccountFields>
        <AccountField label={t('account.email')} value={email} onChangeText={setEmail} email editable={!busy} />
      </AccountFields>
      {emailReady ? null : <AccountNotice>{t('account.notConfigured')}</AccountNotice>}
      {sent ? <AccountNotice>{t('account.resetSent')}</AccountNotice> : null}
      {error ? <AppText role="body" color={colors.sage}>{t(`account.errors.${error}`)}</AppText> : null}
      <AccountButton label={t('account.sendReset')} busy={busy} disabled={!emailReady || email.trim().length === 0} onPress={() => void submit()} />
    </Screen>
  );
}
