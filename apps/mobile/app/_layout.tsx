import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { LocaleProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import '@/src/i18n';
import { useAppFonts } from '@/src/fonts';
import { LanguageProvider, useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { theme } from '@/src/theme';

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [loaded, error] = useAppFonts();

  const ready = loaded || error != null || Platform.OS === 'web';

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <LanguageProvider>
      <LocalizedApp />
    </LanguageProvider>
  );
}

function LocalizedApp() {
  const { direction, language } = useAppLanguage();
  const layout = layoutDirection(direction);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  return (
    <View {...layout.props} style={[{ flex: 1, backgroundColor: theme.colors.background }, layout.style]}>
      <PaperProvider theme={theme}>
        <LocaleProvider direction={direction}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.onSurface,
              contentStyle: { backgroundColor: theme.colors.background, direction },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </LocaleProvider>
      </PaperProvider>
    </View>
  );
}
