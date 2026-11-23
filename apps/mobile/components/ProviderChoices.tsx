import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AccountButton } from '@/components/AccountForm';
import { AppleMark, GoogleMark } from '@/components/ProviderMarks';

export function ProviderChoices({
  mode,
  busy,
  showGoogle,
  showApple,
  onGoogle,
  onApple,
}: {
  mode: 'sign-in' | 'sign-up';
  busy: 'google' | 'apple' | 'email' | null;
  showGoogle: boolean;
  showApple: boolean;
  onGoogle: () => void;
  onApple: () => void;
}) {
  const { t } = useTranslation();
  const googleLabel = mode === 'sign-in' ? t('account.googleSignIn') : t('account.googleSignUp');
  const appleLabel = mode === 'sign-in' ? t('account.appleSignIn') : t('account.appleSignUp');
  if (!showGoogle && !showApple) return null;

  return (
    <View style={styles.group}>
      {showGoogle ? (
        <AccountButton label={googleLabel} tone="card" mark={<GoogleMark />} busy={busy === 'google'} disabled={busy !== null} onPress={onGoogle} />
      ) : null}
      {showApple ? (
        <AccountButton label={appleLabel} tone="card" mark={<AppleMark />} busy={busy === 'apple'} disabled={busy !== null} onPress={onApple} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', gap: 12 },
});
