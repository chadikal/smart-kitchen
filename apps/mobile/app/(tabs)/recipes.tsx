import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import BookOpenIcon from '@/assets/brand/book-open.svg';
import { AppText } from '@/components/AppText';
import { ProfileButton } from '@/components/ProfileButton';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipePhotoView } from '@/components/RecipePhotoView';
import { Screen } from '@/components/Screen';
import { apiBaseUrl } from '@/src/config/api';
import { isAbortError } from '@/src/catalog/discover';
import { fetchRecipeDetail } from '@/src/catalog/recipe-detail';
import { recipeFactsText } from '@/src/catalog/live-recipes';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { savedRecipeFromDetail, type SavedRecipeResolution } from '@/src/recipes/saved';
import { useSavedRecipes } from '@/src/recipes/saved-provider';
import { useSession } from '@/src/auth/session-provider';
import { savedListOwner } from '@/src/recipes/saved';
import { loadDrafts } from '@/src/recipes/draft-storage';
import type { RecipeDraft } from '@/src/recipes/drafts';
import { draftPhoto } from '@/src/recipes/draft-photo';
import { colors, radii } from '@/src/theme/tokens';

type Section = 'saved' | 'created';

export default function RecipesScreen() {
  const { t } = useTranslation();
  const { language, direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const savedRecipes = useSavedRecipes();
  const session = useSession();
  const owner = savedListOwner(session.status, session.profile?.id ?? null);
  const router = useRouter();
  const [section, setSection] = useState<Section>('saved');
  const [attempt, setAttempt] = useState(0);
  const [resolved, setResolved] = useState<Record<string, SavedRecipeResolution>>({});
  const [drafts, setDrafts] = useState<RecipeDraft[]>([]);
  const [draftError, setDraftError] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!owner) { setDrafts([]); return undefined; }
    let active = true;
    setDrafts([]);
    void loadDrafts(owner).then((items) => {
      if (active) { setDrafts(items); setDraftError(false); }
    }).catch(() => { if (active) setDraftError(true); });
    return () => { active = false; };
  }, [owner]));

  useEffect(() => {
    if (!savedRecipes.ready) return undefined;
    const controller = new AbortController();
    const slugs = savedRecipes.saved;
    void Promise.all(slugs.map(async (slug) => {
      try {
        const result = await fetchRecipeDetail(apiBaseUrl, slug, language, controller.signal);
        return [slug, savedRecipeFromDetail(result)] as const;
      } catch (error) {
        if (isAbortError(error)) return null;
        return [slug, { status: 'error' } as const] as const;
      }
    })).then((entries) => {
      if (controller.signal.aborted) return;
      const next: Record<string, SavedRecipeResolution> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setResolved(next);
    });
    return () => controller.abort();
  }, [attempt, language, savedRecipes.ready, savedRecipes.saved]);

  return (
    <Screen includeTopInset>
      <View {...layout.props} style={[styles.titleRow, layout.style]}>
        <View style={styles.titleCopy}>
          <AppText role="display">{t('recipes.title')}</AppText>
        </View>
        <ProfileButton />
      </View>
      <View style={styles.controls}>
        <View {...layout.props} style={[styles.toolbar, layout.style]}>
          <View accessibilityRole="tablist" accessibilityLabel={t('recipes.title')} {...layout.props} style={[styles.segment, layout.style]}>
            <SectionTab label={t('recipes.saved')} selected={section === 'saved'} onPress={() => setSection('saved')} />
            <View style={styles.divider} />
            <SectionTab label={t('recipes.created')} selected={section === 'created'} onPress={() => setSection('created')} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('recipes.create')}
            onPress={() => router.push({ pathname: '/recipe-draft/[id]', params: { id: 'new' } })}
            style={({ pressed }) => [styles.create, layout.style, pressed ? styles.pressed : null]}
            {...layout.props}
          >
            <AppText role="compactTitle" block={false} color={colors.sage}>+</AppText>
            <AppText role="compactTitle" block={false} color={colors.sage}>{t('recipes.create')}</AppText>
          </Pressable>
        </View>
        <AppText role="body" color={colors.muted}>{t(section === 'saved' ? 'recipes.deviceNote' : 'recipes.createdNote')}</AppText>
      </View>
      {section === 'created' ? (
        <View style={styles.list}>
          {draftError ? <AppText role="body" color={colors.sage}>{t('recipes.draftLoadError')}</AppText> : null}
          {!draftError && drafts.length === 0 ? <EmptyState body={t('recipes.emptyCreated')} /> : null}
          {drafts.map((draft) => {
            const photo = draftPhoto(draft.photoUri);
            return (
            <Pressable key={draft.id} accessibilityRole="button" accessibilityLabel={draft.title}
              onPress={() => router.push({ pathname: '/recipe-draft/[id]', params: { id: draft.id } })} style={styles.draftCard}>
              {photo ? <RecipePhotoView photo={photo} title={draft.title} variant="thumbnail" showCredit={false} /> : null}
              <View style={styles.draftCopy}>
                <AppText role="compactTitle" contentLanguage={draft.language}>{draft.title}</AppText>
                <AppText role="meta" color={colors.sage}>{t('recipes.draftStatus')}</AppText>
              </View>
            </Pressable>
            );
          })}
        </View>
      ) : !savedRecipes.ready ? (
        <AppText role="body" color={colors.muted}>{t('recipes.accountPending')}</AppText>
      ) : savedRecipes.saved.length === 0 ? (
        <EmptyState body={t('recipes.emptySaved')} action={t('recipes.browse')} href="/discover" />
      ) : (
        <View style={styles.list}>
          {savedRecipes.saved.map((slug) => {
            const item = resolved[slug];
            if (!item) return <AppText key={slug} role="meta" color={colors.muted}>{t('recipes.loading')}</AppText>;
            if (item.status === 'ready') {
              return (
                <RecipeCard
                  key={slug}
                  slug={item.card.slug}
                  variant="browse"
                  title={item.card.title}
                  photo={item.card.photo}
                  contentLanguage={item.card.contentLanguage}
                  kicker={item.card.kicker}
                  detail={recipeFactsText(item.card, t)}
                  note={item.card.fallback ? t(`discover.fallback.${item.card.contentLanguage}`) : undefined}
                />
              );
            }
            return (
              <View key={slug} style={styles.unavailable}>
                <AppText role="body" color={colors.muted}>
                  {item.status === 'missing' ? t('recipes.unavailable') : t('recipes.loadError')}
                </AppText>
                {item.status === 'error' ? (
                  <Pressable accessibilityRole="button" onPress={() => setAttempt((current) => current + 1)} style={styles.textAction}>
                    <AppText role="compactTitle" block={false} color={colors.sage}>{t('discover.retry')}</AppText>
                  </Pressable>
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('recipes.unsave')} onPress={() => savedRecipes.toggle(slug)} style={styles.textAction}>
                    <AppText role="compactTitle" block={false} color={colors.sage}>{t('recipes.unsave')}</AppText>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function SectionTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.segmentTab, selected ? styles.segmentSelected : null, layout.style, pressed ? styles.pressed : null]}
      {...layout.props}
    >
      <AppText role="meta" block={false} color={selected ? colors.sage : colors.ink} style={styles.segmentLabel}>{label}</AppText>
    </Pressable>
  );
}

function EmptyState({ body, action, href }: { body: string; action?: string; href?: '/discover' }) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  return (
    <View {...layout.props} style={[styles.empty, layout.style]}>
      <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <BookOpenIcon width={28} height={28} />
      </View>
      <AppText role="body" color={colors.muted}>{body}</AppText>
      {action && href ? (
        <Link href={href} asChild>
          <Pressable accessibilityRole="link" style={styles.browse}>
            <AppText role="compactTitle" block={false} color={colors.sage}>{action}</AppText>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleCopy: { flex: 1 },
  pressed: { opacity: 0.72 },
  controls: { width: '100%', gap: 12 },
  toolbar: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  segment: {
    flexShrink: 1,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  segmentTab: {
    minHeight: 44,
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  segmentSelected: { backgroundColor: colors.sageWash },
  segmentLabel: {
    flexShrink: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: undefined,
  },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  create: {
    marginStart: 'auto',
    maxWidth: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.sage,
    backgroundColor: colors.card,
  },
  list: { width: '100%', gap: 12 },
  draftCard: { width: '100%', gap: 12, padding: 10, backgroundColor: colors.card, borderRadius: radii.card, flexDirection: 'row', alignItems: 'flex-start' },
  draftCopy: { flex: 1, gap: 6, paddingVertical: 8, paddingEnd: 8 },
  empty: { width: '100%', gap: 12, alignItems: 'flex-start' },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sageWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browse: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.sage,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  unavailable: { width: '100%', gap: 4, padding: 12, backgroundColor: colors.card, borderRadius: radii.card },
  textAction: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
