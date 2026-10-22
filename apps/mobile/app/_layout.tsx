import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { LocaleProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '@/src/i18n';
import { LanguageProvider, useAppLanguage } from '@/src/i18n/language-provider';
import { theme } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <LocalizedApp />
    </LanguageProvider>
  );
}

function LocalizedApp() {
  const { direction, language } = useAppLanguage();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  return (
    <View style={{ flex: 1, direction, backgroundColor: theme.colors.background }}>
      <PaperProvider theme={theme}>
        <LocaleProvider direction={direction}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.onSurface,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </LocaleProvider>
      </PaperProvider>
    </View>
  );
}
