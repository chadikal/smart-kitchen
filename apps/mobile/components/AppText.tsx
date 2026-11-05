import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { fontFamilyFor, type TextRole } from '@/src/fonts';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { directionFor, localizeDigits, textAlignFor, type AppLanguage } from '@/src/i18n/languages';
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
  accessibilityRole?: 'header';
  numberOfLines?: number;
  /**
   * Script and paragraph direction for API text that may differ from the UI language.
   * Chrome keeps the app language when this is omitted.
   */
  contentLanguage?: AppLanguage;
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

export function AppText({
  children,
  role,
  color = colors.ink,
  block = true,
  accessibilityRole,
  numberOfLines,
  contentLanguage,
  style,
}: AppTextProps) {
  const { direction, language } = useAppLanguage();
  const script = contentLanguage ?? language;
  const scriptDirection = contentLanguage ? directionFor(contentLanguage) : direction;
  const size = sizes[role];
  const arabic = script === 'ar';
  const layout = layoutDirection(scriptDirection);
  const text = (
    <Text
      accessibilityRole={accessibilityRole}
      numberOfLines={numberOfLines}
      style={[
        block ? styles.fill : styles.inline,
        {
          color,
          fontFamily: fontFamilyFor(script, role),
          fontSize: size,
          lineHeight: Math.round(size * (arabic ? 1.5 : role === 'display' || role === 'section' || role === 'featuredTitle' ? 1.18 : 1.45)),
          textAlign: textAlignFor(scriptDirection, Platform.OS === 'web' ? 'web' : 'native-text'),
          writingDirection: scriptDirection,
          ...(Platform.OS === 'web' ? {} : { direction: scriptDirection }),
          textTransform: role === 'eyebrow' && !arabic ? 'uppercase' : 'none',
          letterSpacing: role === 'eyebrow' && !arabic ? 0.4 : 0,
        },
        style,
      ]}
    >
      {displayDigits(children, language)}
    </Text>
  );

  if (!block && !contentLanguage) return text;

  return (
    <View {...layout.props} style={[block ? styles.block : styles.inlineWrap, layout.style]}>
      {text}
    </View>
  );
}

// Keep nested elements (including the Profile's LTR API address) untouched.
function displayDigits(value: ReactNode, language: AppLanguage): ReactNode {
  if (typeof value === 'string' || typeof value === 'number') return localizeDigits(value, language);
  if (Array.isArray(value)) return value.map((child: ReactNode) => displayDigits(child, language));
  return value;
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
  inlineWrap: {
    flexShrink: 1,
  },
});
