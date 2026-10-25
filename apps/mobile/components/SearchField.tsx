import { Platform, StyleSheet, TextInput, View } from 'react-native';
import SearchIcon from '@/assets/brand/search.svg';
import { fontFamilyFor } from '@/src/fonts';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { textAlignFor } from '@/src/i18n/languages';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
  placeholder: string;
};

export function SearchField({ value, onChangeText, label, placeholder }: SearchFieldProps) {
  const { direction, language } = useAppLanguage();
  const layout = layoutDirection(direction);

  return (
    <View {...layout.props} style={[styles.field, layout.style]}>
      <SearchIcon />
      <TextInput
        {...layout.props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[
          styles.input,
          {
            fontFamily: fontFamilyFor(language, 'body'),
            textAlign: textAlignFor(direction, Platform.OS === 'web' ? 'web' : 'native-input'),
            writingDirection: direction,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.search,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 8,
  },
});
