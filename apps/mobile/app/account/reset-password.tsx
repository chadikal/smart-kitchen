import { useState } from 'react';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AccountButton, AccountField, AccountFields, AccountIntro, AccountNotice } from '@/components/AccountForm';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { passwordIsLongEnough, samePassword } from '@/src/auth/auth-errors';
import { useSession } from '@/src/auth/session-provider';
import { supabaseAuth } from '@/src/auth/supabase';
import { colors } from '@/src/theme/tokens';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const session = useSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'passwordShort' | 'passwordMismatch' | 'generic' | null>(null);
  const [saved, setSaved] = useState(false);
  const signedIn = session.status === 'signed-in';

  const submit = async () => {
    setError(null);
    if (!samePassword(password, confirmation)) {
      setError('passwordMismatch');
      return;
    }
    if (!passwordIsLongEnough(password)) {
      setError('passwordShort');
      return;
    }
    const supabase = supabaseAuth();
    if (!supabase) {
      setError('generic');
      return;
    }
    setBusy(true);
    try {
      const updated = await supabase.auth.updateUser({ password });
      if (updated.error) {
        setError('generic');
        return;
      }
      setSaved(true);
      await session.finishSignIn();
    } catch {
      setError('generic');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AccountIntro title={t('account.resetTitle')} body={signedIn ? t('account.resetBody') : t('account.resetExpired')} />
      {signedIn ? (
        <>
          <AccountFields>
            <AccountField label={t('account.newPassword')} value={password} onChangeText={setPassword} secure editable={!busy} />
            <AccountField label={t('account.confirmPassword')} value={confirmation} onChangeText={setConfirmation} secure editable={!busy} />
          </AccountFields>
          {saved ? <AccountNotice>{t('account.passwordUpdated')}</AccountNotice> : null}
          {error ? <AppText role="body" color={colors.sage}>{t(`account.errors.${error}`)}</AppText> : null}
          <AccountButton label={t('account.updatePassword')} busy={busy} onPress={() => void submit()} />
        </>
      ) : (
        <Link href="/account/forgot-password">
          <AppText role="compactTitle" color={colors.sage}>{t('account.sendReset')}</AppText>
        </Link>
      )}
    </Screen>
  );
}
