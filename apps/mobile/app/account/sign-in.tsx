import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AccountButton, AccountDivider, AccountField, AccountFields, AccountNotice } from '@/components/AccountForm';
import { AccountHeader } from '@/components/AccountHeader';
import { AppText } from '@/components/AppText';
import { ProviderChoices } from '@/components/ProviderChoices';
import { Screen } from '@/components/Screen';
import { classifyAuthError, passwordIsLongEnough, type AuthErrorKind } from '@/src/auth/auth-errors';
import { visibleAccountProviders } from '@/src/auth/auth-runtime';
import { currentAuthRuntime } from '@/src/auth/current-runtime';
import { signInWithApple, signInWithBrowserProvider } from '@/src/auth/oauth';
import { useSession } from '@/src/auth/session-provider';
import { supabaseAuth } from '@/src/auth/supabase';
import { isDemoMode } from '@/src/demo/mode';
import { colors } from '@/src/theme/tokens';

export default function SignInScreen() {
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
  const [busy, setBusy] = useState<'email' | 'google' | 'apple' | null>(null);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const emailReady = demo || session.status !== 'unconfigured';

  const run = async (kind: 'email' | 'google' | 'apple', action: () => Promise<{ status: string; message?: string; suggestedName?: string }>) => {
    setError(null);
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

  return (
    <Screen includeTopInset>
      <AccountHeader title={t('account.signIn')} />
      <AccountFields>
        <AccountField label={t('account.email')} value={email} onChangeText={setEmail} email editable={busy === null} />
        <AccountField label={t('account.password')} value={password} onChangeText={setPassword} secure editable={busy === null} />
      </AccountFields>
      {error ? <AppText role="body" color={colors.sage}>{t(`account.errors.${error}`)}</AppText> : null}
      <AccountButton label={t('account.signIn')} busy={busy === 'email'} disabled={busy !== null || !emailReady}
        onPress={() => void run('email', async () => {
          if (!passwordIsLongEnough(password)) {
            setError('passwordShort');
            return { status: 'cancelled' };
          }
          if (demo) return { status: 'cancelled' };
          const supabase = supabaseAuth();
          if (!supabase) return { status: 'error', message: 'unconfigured' };
          const signedIn = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (signedIn.error) return { status: 'error', message: signedIn.error.code ?? signedIn.error.message };
          return { status: 'success' };
        })} />
      {providers.google || providers.apple ? <AccountDivider label={t('account.orContinue')} /> : null}
      <ProviderChoices
        mode="sign-in"
        busy={busy}
        showGoogle={providers.google}
        showApple={providers.apple}
        onGoogle={() => { if (!demo) void run('google', () => signInWithBrowserProvider('google')); }}
        onApple={() => { if (!demo) void run('apple', () => signInWithApple()); }}
      />
      {!demo && session.status === 'unconfigured' ? <AccountNotice>{t('account.notConfigured')}</AccountNotice> : null}
      <View style={styles.links}>
        <Link href="/account/forgot-password"><AppText role="compactTitle" color={colors.sage}>{t('account.forgot')}</AppText></Link>
        <Link href="/account/sign-up"><AppText role="compactTitle" color={colors.sage}>{t('account.createAccount')}</AppText></Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: { alignSelf: 'stretch', gap: 14 },
});
