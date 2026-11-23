import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ArrowLeftIcon from '@/assets/brand/arrow-left.svg';
import { AppText } from '@/components/AppText';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors } from '@/src/theme/tokens';

export function AccountHeader({ title, prominent = false }: { title: string; prominent?: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  return (
    <View {...layout.props} style={[styles.row, layout.style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('recipe.back')}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
        style={styles.back}
      >
        <View style={direction === 'rtl' ? styles.mirror : undefined}>
          <ArrowLeftIcon />
        </View>
      </Pressable>
      <View style={styles.title}>
        <AppText role={prominent ? 'display' : 'section'} accessibilityRole="header">{title}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, minWidth: 0 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mirror: { transform: [{ scaleX: -1 }] },
});
