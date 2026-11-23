import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { fontFamilyFor } from '@/src/fonts';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { textAlignFor } from '@/src/i18n/languages';
import { colors, radii } from '@/src/theme/tokens';

export function AccountField({
  label,
  value,
  onChangeText,
  secure = false,
  email = false,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  email?: boolean;
  editable?: boolean;
}) {
  const { t } = useTranslation();
  const { direction, language } = useAppLanguage();
  const [hidden, setHidden] = useState(true);
  const ltr = email || secure;
  const masked = secure && hidden;
  return (
    <View style={styles.field}>
      <AppText role="meta">{label}</AppText>
      <View style={styles.entry}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={masked}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={email ? 'email-address' : 'default'}
          textContentType={email ? 'emailAddress' : secure ? 'password' : 'name'}
          autoComplete={email ? 'email' : secure ? 'password' : 'name'}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              fontFamily: fontFamilyFor(ltr ? 'en' : language, 'body'),
              textAlign: ltr ? 'left' : textAlignFor(direction, Platform.OS === 'web' ? 'web' : 'native-input'),
              writingDirection: ltr ? 'ltr' : direction,
            },
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('account.showPassword') : t('account.hidePassword')}
            onPress={() => setHidden((current) => !current)}
            style={styles.reveal}
          >
            <AppText role="meta" block={false} color={colors.sage}>{hidden ? t('account.showPassword') : t('account.hidePassword')}</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function AccountIntro({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.intro}>
      <AppText role="section" accessibilityRole="header">{title}</AppText>
      <AppText role="body" color={colors.muted}>{body}</AppText>
    </View>
  );
}

export function AccountFields({ children }: { children: ReactNode }) {
  return <View style={styles.fields}>{children}</View>;
}

export function AccountButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  tone = 'sage',
  mark,
}: {
  label: string;
  onPress?: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'sage' | 'card';
  mark?: ReactNode;
}) {
  const unavailable = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'sage' ? styles.sage : styles.card,
        pressed && !unavailable ? styles.pressed : null,
        unavailable ? styles.disabled : null,
      ]}
    >
      {busy ? <ActivityIndicator color={tone === 'sage' ? colors.card : colors.sage} /> : (
        <View style={styles.buttonRow}>
          {mark}
          <AppText role="compactTitle" block={false} color={tone === 'sage' ? colors.card : colors.ink}>{label}</AppText>
        </View>
      )}
    </Pressable>
  );
}

export function AccountDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <AppText role="meta" block={false} color={colors.muted}>{label}</AppText>
      <View style={styles.rule} />
    </View>
  );
}

export function AccountNotice({ children }: { children: ReactNode }) {
  return <AppText role="body">{children}</AppText>;
}

const styles = StyleSheet.create({
  intro: { gap: 8, alignSelf: 'stretch' },
  fields: { gap: 14, alignSelf: 'stretch' },
  field: { gap: 8, alignSelf: 'stretch' },
  entry: { alignSelf: 'stretch', gap: 4 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.search,
    backgroundColor: colors.card,
    color: colors.ink,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  reveal: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  button: {
    minHeight: 52,
    width: '100%',
    borderRadius: radii.search,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  sage: { backgroundColor: colors.sage },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
});
