import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { theme } from '@/src/theme';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View style={styles.container}>
        <Text variant="titleLarge">{t('notFound.title')}</Text>
        <Link href="/" style={styles.link}>
          <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>
            {t('notFound.action')}
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: theme.colors.background,
  },
  link: {
    paddingVertical: 12,
  },
});
