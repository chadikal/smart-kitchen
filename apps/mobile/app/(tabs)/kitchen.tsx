import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import BookOpenIcon from '@/assets/brand/book-open.svg';
import { AppText } from '@/components/AppText';
import { ProfileButton } from '@/components/ProfileButton';
import { KitchenIngredientSheet } from '@/components/KitchenIngredientSheet';
import { RecipePhotoView } from '@/components/RecipePhotoView';
import { Screen } from '@/components/Screen';
import { demoPhotoFor } from '@/src/catalog/demo-photos';
import type { KeyValueStore } from '@/src/auth/session-storage';
import {
  kitchenIngredientName,
  kitchenRecipeCopy,
  kitchenRecipes,
  matchKitchen,
  previewMissing,
  toggleKitchenIngredient,
  type KitchenMatch,
} from '@/src/kitchen/catalog';
import { loadKitchenSelection, saveKitchenSelection } from '@/src/kitchen/storage';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

const kitchenStore: KeyValueStore = Platform.OS === 'web'
  ? {
      async getItem(key) { return globalThis.localStorage?.getItem(key) ?? null; },
      async setItem(key, value) { globalThis.localStorage?.setItem(key, value); },
      async removeItem(key) { globalThis.localStorage?.removeItem(key); },
    }
  : {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    };

export default function KitchenScreen() {
  const { t } = useTranslation();
  const { language, direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const matches = matchKitchen(selected);

  useEffect(() => {
    let active = true;
    void loadKitchenSelection(kitchenStore).then((stored) => {
      if (!active) return;
      setSelected(stored);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveKitchenSelection(kitchenStore, selected);
  }, [ready, selected]);

  const toggle = (slug: string) => setSelected((current) => toggleKitchenIngredient(current, slug));

  return (
    <Screen includeTopInset>
      <View {...layout.props} style={[styles.titleRow, layout.style]}>
        <View style={styles.titleCopy}>
          <AppText role="display">{t('kitchen.title')}</AppText>
          <AppText role="body" color={colors.muted}>{t('kitchen.body')}</AppText>
        </View>
        <ProfileButton />
      </View>
      <View style={styles.block}>
        <View {...layout.props} style={[styles.pantryHeader, layout.style]}>
          <AppText role="compactTitle" block={false} style={styles.pantryTitle}>{t('kitchen.inMyKitchen')}</AppText>
          <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.add, pressed ? styles.pressed : null]}>
            <AppText role="compactTitle" block={false} color={colors.sage}>{t('kitchen.add')}</AppText>
          </Pressable>
        </View>
        {selected.length === 0 ? (
          <View {...layout.props} style={[styles.empty, layout.style]}>
            <View style={styles.emptyMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <BookOpenIcon width={28} height={28} />
            </View>
            <AppText role="body" color={colors.muted}>{t('kitchen.empty')}</AppText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            {...layout.props}
            style={[styles.chipScroll, layout.style]}
            contentContainerStyle={[styles.chips, layout.style]}
          >
            {selected.map((slug) => {
              const name = kitchenIngredientName(slug, language) ?? slug;
              return (
                <Pressable
                  key={slug}
                  accessibilityRole="button"
                  accessibilityLabel={t('kitchen.remove', { name })}
                  onPress={() => toggle(slug)}
                  style={({ pressed }) => StyleSheet.flatten([styles.chip, layout.style, pressed ? styles.pressed : null])}
                  {...layout.props}
                >
                  <AppText role="meta" block={false}>{name}</AppText>
                  <AppText role="compactTitle" block={false} color={colors.sage} style={styles.chipRemove}>×</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
      {selected.length > 0 ? (
        <View style={styles.block}>
          <AppText role="section">{t('kitchen.results')}</AppText>
          {matches.length === 0 ? <AppText role="body" color={colors.muted}>{t('kitchen.noMatches')}</AppText> : matches.map((match) => (
            <KitchenMatchCard key={`${match.slug}:${match.missingRequired.join('|')}`} match={match} language={language} />
          ))}
        </View>
      ) : null}
      <KitchenIngredientSheet
        visible={pickerOpen}
        selected={selected}
        onToggle={toggle}
        onReset={() => setSelected([])}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

function KitchenMatchCard({ match, language }: { match: KitchenMatch; language: 'en' | 'ar' }) {
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const recipe = kitchenRecipes.find((item) => item.slug === match.slug);
  const [expanded, setExpanded] = useState(false);
  if (!recipe) return null;
  const copy = kitchenRecipeCopy(recipe, language);
  const missingNames = match.missingRequired.flatMap((slug) => {
    const name = kitchenIngredientName(slug, language);
    return name ? [name] : [];
  });
  const preview = previewMissing(missingNames);
  const visibleNames = expanded ? missingNames : preview.shown;

  const summary = visibleNames.length > 0 ? `${t('kitchen.missing')} ${visibleNames.join(', ')}` : null;

  return (
    <View {...layout.props} style={StyleSheet.flatten([styles.card, layout.style])}>
      <Link href={{ pathname: '/recipe/[slug]', params: { slug: recipe.slug } }} asChild>
        <Pressable accessibilityRole="link" style={styles.photoLink}>
          <RecipePhotoView photo={demoPhotoFor(recipe.slug)} title={copy.title} variant="thumbnail" showCredit={false} />
        </Pressable>
      </Link>
      <View style={styles.cardCopy}>
        <Link href={{ pathname: '/recipe/[slug]', params: { slug: recipe.slug } }} asChild>
          <Pressable accessibilityRole="link">
            <AppText role="compactTitle" contentLanguage={copy.contentLanguage}>{copy.title}</AppText>
            {copy.fallback ? <AppText role="meta" color={colors.sage}>{t(`discover.fallback.${copy.contentLanguage}`)}</AppText> : null}
            <AppText role="meta" color={colors.muted}>{t('kitchen.available', { matched: match.matchedRequired, total: match.requiredCount })}</AppText>
            {summary ? <AppText role="meta" color={colors.muted}>{summary}</AppText> : null}
          </Pressable>
        </Link>
        {!expanded && preview.extra > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('kitchen.showMissing')} onPress={() => setExpanded(true)} hitSlop={8} style={styles.more}>
            <AppText role="meta" block={false} color={colors.sage}>{t('kitchen.more', { count: preview.extra })}</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, width: '100%' },
  titleCopy: { flex: 1, gap: 8 },
  block: { gap: 12, width: '100%' },
  pantryHeader: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 8,
  },
  pantryTitle: { flexShrink: 1 },
  empty: { gap: 12, alignItems: 'flex-start', width: '100%' },
  emptyMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sageWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: { width: '100%', flexGrow: 0 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingEnd: 28 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.sage,
    backgroundColor: colors.sageWash,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  chipRemove: {
    minWidth: 22,
    textAlign: 'center',
    lineHeight: undefined,
    includeFontPadding: false,
  },
  pressed: { opacity: 0.72 },
  add: {
    minHeight: 44,
    marginStart: 'auto',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.sage,
    backgroundColor: colors.card,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 10,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  photoLink: { flexShrink: 0 },
  cardCopy: { flex: 1, gap: 2 },
  more: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
