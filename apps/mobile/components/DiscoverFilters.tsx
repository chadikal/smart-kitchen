import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChevronIcon from '@/assets/brand/chevron-down.svg';
import SlidersIcon from '@/assets/brand/sliders-horizontal.svg';
import { AppText } from '@/components/AppText';
import {
  maxMinuteChoices,
  type CatalogOption,
  type DiscoverDifficulty,
  type DiscoverFilters,
} from '@/src/catalog/discover';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

type OptionState = CatalogOption[] | 'loading' | 'error';
type Picker = 'country' | 'cuisine' | 'dietaryTag' | 'difficulty' | 'time' | null;

type DiscoverFiltersProps = {
  visible: boolean;
  draft: DiscoverFilters;
  countries: OptionState;
  cuisines: OptionState;
  dietaryTags: OptionState;
  previewTotal: number | null;
  onChange: (filters: DiscoverFilters) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
  onRetryOptions: () => void;
};

export function DiscoverFiltersSheet({
  visible,
  draft,
  countries,
  cuisines,
  dietaryTags,
  previewTotal,
  onChange,
  onReset,
  onApply,
  onClose,
  onRetryOptions,
}: DiscoverFiltersProps) {
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState<Picker>(null);

  function closePicker() {
    setPicker(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={t('discover.close')} onPress={onClose} />
        <View
          {...layout.props}
          accessibilityViewIsModal
          style={[styles.sheet, layout.style, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View {...layout.props} style={[styles.heading, layout.style]}>
            <View {...layout.props} style={[styles.headingLabel, layout.style]}>
              <SlidersIcon />
              <AppText role="compactTitle" block={false}>{t('discover.filters')}</AppText>
            </View>
            <Pressable accessibilityRole="button" onPress={() => { closePicker(); onReset(); }}>
              <AppText role="meta" block={false} color={colors.sage}>{t('discover.resetAll')}</AppText>
            </Pressable>
          </View>
          {picker ? (
            <OptionList
              label={t(labelKey(picker))}
              selected={selectedSlug(draft, picker)}
              anyLabel={t(anyKey(picker))}
              options={optionsFor(picker, countries, cuisines, dietaryTags, t)}
              onRetry={onRetryOptions}
              onSelect={(slug) => {
                onChange(applySelection(draft, picker, slug));
                closePicker();
              }}
            />
          ) : (
            <View style={styles.grid}>
              <Field label={t('discover.country')} value={labelFor(draft.country, countries, t('discover.anyCountry'))} selected={draft.country !== null} onPress={() => setPicker('country')} />
              <Field label={t('discover.cuisine')} value={labelFor(draft.cuisine, cuisines, t('discover.anyCuisine'))} selected={draft.cuisine !== null} onPress={() => setPicker('cuisine')} />
              <Field label={t('discover.dietary')} value={labelFor(draft.dietaryTag, dietaryTags, t('discover.anyDietary'))} selected={draft.dietaryTag !== null} onPress={() => setPicker('dietaryTag')} />
              <Field label={t('discover.difficulty')} value={draft.difficulty ? t(`home.difficulty.${draft.difficulty}`) : t('discover.anyDifficulty')} selected={draft.difficulty !== null} onPress={() => setPicker('difficulty')} />
              <Field label={t('discover.time')} value={draft.maxTotalMinutes === null ? t('discover.anyTime') : t('discover.minutesOrLess', { count: draft.maxTotalMinutes })} selected={draft.maxTotalMinutes !== null} onPress={() => setPicker('time')} />
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={onApply} style={styles.apply}>
            <AppText role="compactTitle" block={false} color={colors.card}>
              {previewTotal === null ? t('discover.showRecipes') : t('discover.showRecipesCount', { count: previewTotal })}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, selected, onPress }: { label: string; value: string; selected: boolean; onPress: () => void }) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  return (
    <View style={styles.field}>
      <AppText role="meta" color={colors.muted}>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={onPress}
        style={[styles.selector, selected ? styles.selectorSelected : null, layout.style]}
        {...layout.props}
      >
        <AppText role="meta" block={false}>{value}</AppText>
        <ChevronIcon />
      </Pressable>
    </View>
  );
}

function OptionList({
  label,
  selected,
  anyLabel,
  options,
  onSelect,
  onRetry,
}: {
  label: string;
  selected: string | null;
  anyLabel: string;
  options: OptionState | { slug: string; name: string }[];
  onSelect: (slug: string | null) => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  if (options === 'loading') return <AppText role="body">{t('discover.loading')}</AppText>;
  if (options === 'error') {
    return (
      <View style={styles.optionMessage}>
        <AppText role="body">{t('discover.optionsUnavailable')}</AppText>
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <AppText role="compactTitle" color={colors.sage}>{t('discover.retry')}</AppText>
        </Pressable>
      </View>
    );
  }
  const choices = [{ slug: null, name: anyLabel }, ...options];
  return (
    <ScrollView style={styles.optionScroll} contentContainerStyle={styles.optionList}>
      <AppText role="meta" color={colors.muted}>{label}</AppText>
      {choices.map((choice) => {
        const isSelected = choice.slug === selected;
        return (
          <Pressable
            key={choice.slug ?? 'any'}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(choice.slug)}
            style={[styles.option, isSelected ? styles.selectorSelected : null, layout.style]}
            {...layout.props}
          >
            <AppText role="body">{choice.name}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function labelKey(picker: Exclude<Picker, null>): string {
  if (picker === 'country') return 'discover.country';
  if (picker === 'cuisine') return 'discover.cuisine';
  if (picker === 'dietaryTag') return 'discover.dietary';
  if (picker === 'difficulty') return 'discover.difficulty';
  return 'discover.time';
}

function anyKey(picker: Exclude<Picker, null>): string {
  if (picker === 'country') return 'discover.anyCountry';
  if (picker === 'cuisine') return 'discover.anyCuisine';
  if (picker === 'dietaryTag') return 'discover.anyDietary';
  if (picker === 'difficulty') return 'discover.anyDifficulty';
  return 'discover.anyTime';
}

function selectedSlug(filters: DiscoverFilters, picker: Exclude<Picker, null>): string | null {
  if (picker === 'country') return filters.country;
  if (picker === 'cuisine') return filters.cuisine;
  if (picker === 'dietaryTag') return filters.dietaryTag;
  if (picker === 'difficulty') return filters.difficulty;
  return filters.maxTotalMinutes === null ? null : String(filters.maxTotalMinutes);
}

function labelFor(slug: string | null, options: OptionState, fallback: string): string {
  if (!slug || options === 'loading' || options === 'error') return fallback;
  return options.find((option) => option.slug === slug)?.name ?? slug;
}

function optionsFor(
  picker: Exclude<Picker, null>,
  countries: OptionState,
  cuisines: OptionState,
  dietaryTags: OptionState,
  t: (key: string, values?: Record<string, unknown>) => string,
): OptionState | { slug: string; name: string }[] {
  if (picker === 'country') return countries;
  if (picker === 'cuisine') return cuisines;
  if (picker === 'dietaryTag') return dietaryTags;
  if (picker === 'difficulty') {
    const difficulties: DiscoverDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
    return difficulties.map((slug) => ({ slug, name: t(`home.difficulty.${slug}`) }));
  }
  return maxMinuteChoices.map((minutes) => ({
    slug: String(minutes),
    name: t('discover.minutesOrLess', { count: minutes }),
  }));
}

function applySelection(filters: DiscoverFilters, picker: Exclude<Picker, null>, slug: string | null): DiscoverFilters {
  if (picker === 'country') return { ...filters, country: slug };
  if (picker === 'cuisine') return { ...filters, cuisine: slug };
  if (picker === 'dietaryTag') return { ...filters, dietaryTag: slug };
  if (picker === 'difficulty') return { ...filters, difficulty: slug as DiscoverDifficulty | null };
  return { ...filters, maxTotalMinutes: slug === null ? null : Number(slug) };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(48, 61, 50, 0.28)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 15,
  },
  heading: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  field: {
    width: '47%',
    flexGrow: 1,
    gap: 5,
  },
  selector: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  selectorSelected: {
    backgroundColor: colors.sageWash,
    borderColor: colors.sage,
  },
  apply: {
    minHeight: 50,
    borderRadius: radii.search,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionScroll: {
    maxHeight: 320,
  },
  optionList: {
    gap: 8,
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  optionMessage: {
    gap: 8,
  },
});
