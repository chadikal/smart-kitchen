import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii } from '@/src/theme/tokens';

export type PreferenceOption = {
  slug: string;
  name: string;
};

export function PreferenceChips({
  options,
  selected,
  onToggle,
  disabled = false,
}: {
  options: PreferenceOption[];
  selected: string[];
  onToggle: (slug: string) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;
  const chosen = new Set(selected);
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = chosen.has(option.slug);
        return (
          <Pressable
            key={option.slug}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => onToggle(option.slug)}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.active : styles.idle,
              pressed && !disabled ? styles.pressed : null,
              disabled ? styles.disabled : null,
            ]}
          >
            <AppText role="meta" block={false} color={active ? colors.card : colors.ink}>
              {option.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignSelf: 'stretch' },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  idle: { backgroundColor: colors.card, borderColor: colors.line },
  active: { backgroundColor: colors.sage, borderColor: colors.sage },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});
