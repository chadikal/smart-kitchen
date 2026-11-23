import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AccountButton, AccountDivider, AccountField, AccountFields, AccountNotice } from '@/components/AccountForm';
import { AccountHeader } from '@/components/AccountHeader';
import { AppText } from '@/components/AppText';
import { ProviderChoices } from '@/components/ProviderChoices';
import { Screen } from '@/components/Screen';
import { classifyAuthError, passwordIsLongEnough, passwordMismatchVisible, samePassword, type AuthErrorKind } from '@/src/auth/auth-errors';
import { visibleAccountProviders } from '@/src/auth/auth-runtime';
import { currentAuthRuntime } from '@/src/auth/current-runtime';
import { signInWithApple, signInWithBrowserProvider } from '@/src/auth/oauth';
import { authRedirectUrl } from '@/src/auth/redirect';
import { useSession } from '@/src/auth/session-provider';
import { supabaseAuth } from '@/src/auth/supabase';
import { isDemoMode } from '@/src/demo/mode';
import { colors } from '@/src/theme/tokens';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const session = useSession();
  const demo = isDemoMode();
  const providers = visibleAccountProviders({
    demo,
    runtime: currentAuthRuntime(),
    googleConfigured: session.googleEnabled,
    appleConfigured: session.appleEnabled,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | 'apple' | null>(null);
  const [notice, setNotice] = useState<'confirm' | null>(null);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const emailReady = demo || session.status !== 'unconfigured';
  const mismatch = passwordMismatchVisible(password, confirmation, submitted);

  const runProvider = async (kind: 'google' | 'apple', action: () => Promise<{ status: string; message?: string; suggestedName?: string }>) => {
    setError(null);
    setNotice(null);
    setBusy(kind);
    try {
      const result = await action();
      if (result.status === 'cancelled') return;
      if (result.status !== 'success') {
        setError(classifyAuthError({ message: result.message, code: result.message }));
        return;
      }
      await session.finishSignIn(false, result.suggestedName);
    } catch (caught) {
      setError(classifyAuthError(caught instanceof Error ? caught : null));
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    setNotice(null);
    if (!samePassword(password, confirmation)) return;
    if (!passwordIsLongEnough(password)) {
      setError('passwordShort');
      return;
    }
    if (demo) return;
    const supabase = supabaseAuth();
    if (!supabase) {
      setError('generic');
      return;
    }
    setBusy('email');
    try {
      const created = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (created.error) {
        setError(classifyAuthError(created.error));
        return;
      }
      if (created.data.session) {
        await session.finishSignIn();
        return;
      }
      setNotice('confirm');
    } catch (caught) {
      setError(classifyAuthError(caught instanceof Error ? caught : null));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen includeTopInset>
      <AccountHeader title={t('account.createAccount')} />
      <AccountFields>
        <AccountField label={t('account.email')} value={email} onChangeText={setEmail} email editable={busy === null} />
        <AccountField label={t('account.password')} value={password} onChangeText={setPassword} secure editable={busy === null} />
        <AccountField label={t('account.confirmPassword')} value={confirmation} onChangeText={setConfirmation} secure editable={busy === null} />
      </AccountFields>
      {mismatch ? <AppText role="body" color={colors.sage}>{t('account.errors.passwordMismatch')}</AppText> : null}
      {notice === 'confirm' ? <AccountNotice>{t('account.confirmEmail')}</AccountNotice> : null}
      {error ? <AppText role="body" color={colors.sage}>{t(`account.errors.${error}`)}</AppText> : null}
      <AccountButton label={t('account.createAccount')} busy={busy === 'email'} disabled={busy !== null || !emailReady} onPress={() => void submit()} />
      {providers.google || providers.apple ? <AccountDivider label={t('account.orContinue')} /> : null}
      <ProviderChoices
        mode="sign-up"
        busy={busy}
        showGoogle={providers.google}
        showApple={providers.apple}
        onGoogle={() => { if (!demo) void runProvider('google', () => signInWithBrowserProvider('google')); }}
        onApple={() => { if (!demo) void runProvider('apple', () => signInWithApple()); }}
      />
      {!demo && session.status === 'unconfigured' ? <AccountNotice>{t('account.notConfigured')}</AccountNotice> : null}
      <Link href="/account/sign-in" style={styles.link}><AppText role="compactTitle" color={colors.sage}>{t('account.signIn')}</AppText></Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
});
