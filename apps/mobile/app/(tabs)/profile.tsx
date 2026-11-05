import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Screen } from '@/components/Screen';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.copy}>
        <AppText role="section">{t('profile.title')}</AppText>
      </View>
      <View style={styles.language}>
        <AppText role="compactTitle">{t('profile.language')}</AppText>
        <LanguageSelector
          label={t('profile.language')}
          english={t('language.english')}
          arabic={t('language.arabic')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'stretch',
    gap: 12,
  },
  language: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'stretch',
    gap: 12,
  },
});
