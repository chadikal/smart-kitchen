import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/src/theme/tokens';

export default function AccountLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: t('account.forgotTitle'), headerTitle: '' }} />
      <Stack.Screen name="reset-password" options={{ title: t('account.resetTitle'), headerTitle: '' }} />
      <Stack.Screen name="welcome" options={{ title: t('account.welcomeTitle'), headerTitle: '', headerBackVisible: false }} />
    </Stack>
  );
}
