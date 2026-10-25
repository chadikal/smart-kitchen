import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import type { AppLanguage } from '@/src/i18n/languages';
import { colors, radii } from '@/src/theme/tokens';

type LanguageSelectorProps = {
  label: string;
  english: string;
  arabic: string;
};

const options: readonly { value: AppLanguage; key: 'english' | 'arabic' }[] = [
  { value: 'en', key: 'english' },
  { value: 'ar', key: 'arabic' },
];

export function LanguageSelector({ label, english, arabic }: LanguageSelectorProps) {
  const { language, setLanguage } = useAppLanguage();
  const labels = { english, arabic };
  const ltr = layoutDirection('ltr');

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      {...ltr.props}
      style={[styles.group, ltr.style]}
    >
      {options.map((option, index) => {
        const selected = language === option.value;
        return (
          <View key={option.value} style={styles.segment}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={labels[option.key]}
              onPress={() => setLanguage(option.value)}
              style={({ pressed }) => [
                styles.button,
                selected ? styles.selected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <AppText role="compactTitle" style={styles.label}>
                {labels[option.key]}
              </AppText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.search,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.sageWash,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    textAlign: 'center',
  },
});
