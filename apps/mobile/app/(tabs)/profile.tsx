import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Screen } from '@/components/Screen';
import { apiBaseUrl } from '@/src/config/api';
import { colors } from '@/src/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.copy}>
        <AppText role="section">{t('profile.title')}</AppText>
        <AppText role="body">{t('profile.body')}</AppText>
      </View>
      <View style={styles.language}>
        <AppText role="compactTitle">{t('profile.language')}</AppText>
        <LanguageSelector
          label={t('profile.language')}
          english={t('language.english')}
          arabic={t('language.arabic')}
        />
        <AppText role="meta" color={colors.muted}>
          {t('profile.apiLabel')}{' '}
          <Text style={styles.url}>{`\u2066${apiBaseUrl}\u2069`}</Text>
        </AppText>
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
  url: {
    writingDirection: 'ltr',
  },
});
