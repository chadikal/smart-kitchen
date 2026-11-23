import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { AccountNotice } from '@/components/AccountForm';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { readAuthCallback } from '@/src/auth/callback-url';
import { exchangeAuthCallback } from '@/src/auth/oauth';
import { useSession } from '@/src/auth/session-provider';
import { colors } from '@/src/theme/tokens';

export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { finishSignIn } = useSession();
  const url = Linking.useURL();
  const handled = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url || handled.current === url) return undefined;
    handled.current = url;
    let active = true;
    const callback = readAuthCallback(url);
    void exchangeAuthCallback(url).then(async (result) => {
      if (!active) return;
      if (result.status !== 'success') {
        setFailed(true);
        return;
      }
      await finishSignIn(callback.kind === 'code' && callback.recovery);
    });
    return () => {
      active = false;
    };
  }, [finishSignIn, url]);

  return (
    <Screen>
      {failed ? (
        <>
          <AppText role="body" color={colors.sage}>{t('account.errors.generic')}</AppText>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/account/sign-in')}>
            <AppText role="compactTitle" color={colors.sage}>{t('account.signIn')}</AppText>
          </Pressable>
        </>
      ) : <AccountNotice>{t('account.loading')}</AccountNotice>}
    </Screen>
  );
}
