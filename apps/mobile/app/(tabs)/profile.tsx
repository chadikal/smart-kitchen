import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { apiBaseUrl } from '@/src/config/api';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useAppLanguage } from '@/src/i18n/language-provider';
import type { AppLanguage } from '@/src/i18n/languages';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { language, direction, setLanguage } = useAppLanguage();
  const textAlign = direction === 'rtl' ? 'right' : 'left';

  return (
    <View style={styles.screen}>
      <PlaceholderScreen title={t('profile.title')} body={t('profile.body')} />
      <View style={styles.language}>
        <Text variant="titleMedium" style={{ textAlign, writingDirection: direction }}>
          {t('profile.language')}
        </Text>
        <SegmentedButtons
          value={language}
          onValueChange={(value) => {
            if (value === 'en' || value === 'ar') {
              setLanguage(value);
            }
          }}
          buttons={[
            { value: 'en' satisfies AppLanguage, label: t('language.english') },
            { value: 'ar' satisfies AppLanguage, label: t('language.arabic') },
          ]}
        />
        <Text variant="bodyMedium" style={{ textAlign, writingDirection: direction }}>
          {t('profile.api', { url: apiBaseUrl })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  language: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
});
