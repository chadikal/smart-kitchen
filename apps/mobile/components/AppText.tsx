import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { fontFamilyFor, type TextRole } from '@/src/fonts';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { textAlignFor } from '@/src/i18n/languages';
import { layoutDirection } from '@/src/i18n/layout';
import { colors } from '@/src/theme/tokens';

type AppTextProps = {
  children: ReactNode;
  role: TextRole;
  color?: string;
  /**
   * Block text fills the content width so alignment reaches the screen edge.
   * Inline text stays beside icons and inside hugging controls.
   */
  block?: boolean;
  style?: StyleProp<TextStyle>;
};

const sizes: Record<TextRole, number> = {
  display: 32,
  section: 22,
  featuredTitle: 24,
  compactTitle: 16,
  body: 16,
  meta: 12,
  eyebrow: 10,
  wordmark: 28,
};

export function AppText({ children, role, color = colors.ink, block = true, style }: AppTextProps) {
  const { direction, language } = useAppLanguage();
  const size = sizes[role];
  const arabic = language === 'ar';
  const layout = layoutDirection(direction);
  const text = (
    <Text
      style={[
        block ? styles.fill : styles.inline,
        {
          color,
          fontFamily: fontFamilyFor(language, role),
          fontSize: size,
          lineHeight: Math.round(size * (arabic ? 1.5 : role === 'display' || role === 'section' || role === 'featuredTitle' ? 1.18 : 1.45)),
          textAlign: textAlignFor(direction, Platform.OS === 'web' ? 'web' : 'native-text'),
          writingDirection: direction,
          ...(Platform.OS === 'web' ? {} : { direction }),
          textTransform: role === 'eyebrow' && !arabic ? 'uppercase' : 'none',
          letterSpacing: role === 'eyebrow' && !arabic ? 0.4 : 0,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );

  if (!block) return text;

  return (
    <View {...layout.props} style={[styles.block, layout.style]}>
      {text}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignSelf: 'stretch',
    width: '100%',
  },
  fill: {
    width: '100%',
  },
  inline: {
    flexShrink: 1,
  },
});
