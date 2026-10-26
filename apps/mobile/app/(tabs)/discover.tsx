import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import SlidersIcon from '@/assets/brand/sliders-horizontal.svg';
import { AppText } from '@/components/AppText';
import { DiscoverFiltersSheet } from '@/components/DiscoverFilters';
import { RecipeCard } from '@/components/RecipeCard';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { apiBaseUrl } from '@/src/config/api';
import { readLiveRecipeList, type LiveRecipeCard } from '@/src/catalog/live-recipes';
import {
  acceptOptionResponse,
  acceptPreviewResponse,
  beginOptionRequest,
  canLoadMore,
  completeBrowse,
  emptyDiscoverFilters,
  filtersAreActive,
  initialBrowseState,
  isAbortError,
  nextPreviewRequest,
  pendingPreviewCount,
  planBrowse,
  previewCountFromBody,
  readCatalogOptions,
  recipeSearchParams,
  responseStillCurrent,
  retainNewerBrowse,
  type BrowseKind,
  type BrowseState,
  type CatalogOption,
  type DiscoverFilters,
  type OptionRequest,
} from '@/src/catalog/discover';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

type OptionState = CatalogOption[] | 'loading' | 'error';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { language, direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const [query, setQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [filters, setFilters] = useState<DiscoverFilters>(emptyDiscoverFilters);
  const [draft, setDraft] = useState<DiscoverFilters>(emptyDiscoverFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [browse, setBrowse] = useState<BrowseState>(initialBrowseState);
  const [countries, setCountries] = useState<OptionState>('loading');
  const [cuisines, setCuisines] = useState<OptionState>('loading');
  const [dietaryTags, setDietaryTags] = useState<OptionState>('loading');
  const [previewTotal, setPreviewTotal] = useState<number | 'pending' | null>(null);
  const browseRef = useRef<BrowseState>(initialBrowseState());
  const browseAbort = useRef<AbortController | null>(null);
  const optionAbort = useRef<AbortController | null>(null);
  const optionRequest = useRef<OptionRequest | null>(null);
  const previewAbort = useRef<AbortController | null>(null);
  const previewRequest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setCommittedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const publishBrowse = useCallback((next: BrowseState) => {
    const snapshot = retainNewerBrowse(browseRef.current, next);
    browseRef.current = snapshot;
    setBrowse((current) => retainNewerBrowse(current, snapshot));
  }, []);

  const loadOptions = useCallback(() => {
    optionAbort.current?.abort();
    const controller = new AbortController();
    optionAbort.current = controller;
    const request = beginOptionRequest(optionRequest.current, language);
    optionRequest.current = request;
    setCountries('loading');
    setCuisines('loading');
    setDietaryTags('loading');
    void Promise.all([
      readJson(`${apiBaseUrl}/countries?lang=${request.language}`, controller.signal),
      readJson(`${apiBaseUrl}/cuisines?lang=${request.language}`, controller.signal),
      readJson(`${apiBaseUrl}/dietary-tags?lang=${request.language}`, controller.signal),
    ])
      .then(([countryBody, cuisineBody, dietaryBody]) => {
        if (!optionRequest.current || !acceptOptionResponse(optionRequest.current, request)) return;
        if (controller.signal.aborted) return;
        setCountries(countryBody ? readCatalogOptions(countryBody) ?? 'error' : 'error');
        setCuisines(cuisineBody ? readCatalogOptions(cuisineBody) ?? 'error' : 'error');
        setDietaryTags(dietaryBody ? readCatalogOptions(dietaryBody) ?? 'error' : 'error');
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        if (!optionRequest.current || !acceptOptionResponse(optionRequest.current, request)) return;
        setCountries('error');
        setCuisines('error');
        setDietaryTags('error');
      });
  }, [language]);

  const startBrowse = useCallback((kind: BrowseKind, page: number) => {
    const planned = planBrowse(browseRef.current, kind);
    if (!planned) return;
    browseAbort.current?.abort();
    const controller = new AbortController();
    browseAbort.current = controller;
    const requestId = planned.requestId;
    publishBrowse(planned);
    void readJson(recipeUrl(language, committedQuery, filters, page), controller.signal)
      .then((body) => {
        if (!responseStillCurrent(browseRef.current.requestId, requestId, controller.signal.aborted)) return;
        const result = body ? readLiveRecipeList(body) : { ok: false as const };
        publishBrowse(completeBrowse(browseRef.current, { requestId, kind, page, result }));
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        if (!responseStillCurrent(browseRef.current.requestId, requestId, controller.signal.aborted)) return;
        publishBrowse(completeBrowse(browseRef.current, { requestId, kind, page, result: { ok: false } }));
      });
  }, [committedQuery, filters, language, publishBrowse]);

  useEffect(() => {
    const timer = setTimeout(() => loadOptions(), 0);
    return () => {
      clearTimeout(timer);
      optionAbort.current?.abort();
    };
  }, [loadOptions]);

  useEffect(() => {
    const timer = setTimeout(() => startBrowse('replace', 1), 0);
    return () => {
      clearTimeout(timer);
      browseAbort.current?.abort();
    };
  }, [startBrowse]);

  useEffect(() => {
    return () => {
      browseAbort.current?.abort();
      optionAbort.current?.abort();
      previewAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen) {
      previewAbort.current?.abort();
      previewAbort.current = null;
      return undefined;
    }
    previewAbort.current?.abort();
    const controller = new AbortController();
    previewAbort.current = controller;
    const requestId = nextPreviewRequest(previewRequest.current);
    previewRequest.current = requestId;
    const timer = setTimeout(() => {
      const params = recipeSearchParams({ language, query: committedQuery, filters: draft, page: 1 });
      params.set('pageSize', '1');
      void readJson(`${apiBaseUrl}/recipes?${params.toString()}`, controller.signal)
        .then((body) => {
          if (!acceptPreviewResponse(previewRequest.current, requestId, controller.signal.aborted)) return;
          setPreviewTotal(previewCountFromBody(body));
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return;
          if (!acceptPreviewResponse(previewRequest.current, requestId, controller.signal.aborted)) return;
          setPreviewTotal(null);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filtersOpen, draft, language, committedQuery]);

  function invalidatePreview() {
    previewRequest.current = nextPreviewRequest(previewRequest.current);
    setPreviewTotal(pendingPreviewCount());
  }

  function openFilters() {
    setDraft(filters);
    invalidatePreview();
    setFiltersOpen(true);
  }

  function applyFilters() {
    setFilters(draft);
    setFiltersOpen(false);
  }

  const countryName = optionName(countries, filters.country);
  const timeLabel =
    filters.maxTotalMinutes === null
      ? t('discover.anyTime')
      : t('discover.minutesOrLess', { count: filters.maxTotalMinutes });
  const refreshing = browse.status === 'refreshing';

  return (
    <Screen
      includeTopInset
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            startBrowse('refresh', 1);
          }}
          tintColor={colors.sage}
          colors={[colors.sage]}
        />
      }
    >
      <View style={styles.intro}>
        <AppText role="eyebrow" color={colors.sage}>{t('discover.eyebrow')}</AppText>
        <AppText role="display">{t('discover.heading')}</AppText>
        <AppText role="body" color={colors.muted}>{t('discover.subtitle')}</AppText>
      </View>
      <SearchField
        value={query}
        onChangeText={setQuery}
        label={t('discover.searchLabel')}
        placeholder={t('discover.searchPlaceholder')}
        clearLabel={t('discover.clearSearch')}
        onClear={() => setQuery('')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        {...layout.props}
        style={layout.style}
        contentContainerStyle={[styles.chips, layout.style]}
      >
        <Chip label={t('discover.filters')} icon selected expanded={filtersOpen} onPress={openFilters} />
        <Chip label={countryName ?? t('discover.allCountries')} onPress={openFilters} />
        <Chip label={timeLabel} onPress={openFilters} />
        {filters.cuisine ? <Chip label={optionName(cuisines, filters.cuisine) ?? filters.cuisine} onPress={openFilters} /> : null}
        {filters.dietaryTag ? <Chip label={optionName(dietaryTags, filters.dietaryTag) ?? filters.dietaryTag} onPress={openFilters} /> : null}
        {filters.difficulty ? <Chip label={t(`home.difficulty.${filters.difficulty}`)} onPress={openFilters} /> : null}
      </ScrollView>
      {browse.status === 'error' && browse.items.length > 0 ? (
        <Retry label={t('discover.unavailable')} action={t('discover.retry')} onPress={() => startBrowse('refresh', 1)} />
      ) : null}
      {browse.status === 'loading' ? <AppText role="body">{t('discover.loading')}</AppText> : null}
      {browse.status === 'error' && browse.items.length === 0 ? (
        <Retry label={t('discover.unavailable')} action={t('discover.retry')} onPress={() => startBrowse('replace', 1)} />
      ) : null}
      {browse.status === 'ready' && browse.items.length === 0 ? (
        <View style={styles.empty}>
          <AppText role="body">{t('discover.empty')}</AppText>
          {filtersAreActive(filters) ? (
            <Pressable accessibilityRole="button" onPress={() => setFilters(emptyDiscoverFilters())}>
              <AppText role="compactTitle" color={colors.sage}>{t('discover.clearFilters')}</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {browse.items.length > 0 ? (
        <View style={styles.results}>
          <AppText role="compactTitle">{t('discover.results', { count: browse.total })}</AppText>
          {browse.items.map((item) => (
            <RecipeCard
              key={item.slug}
              variant="compact"
              title={item.title}
              detail={recipeDetail(item, t)}
              note={recipeNote(item, t)}
            />
          ))}
          {browse.status === 'loadingMore' ? <AppText role="meta">{t('discover.loadingMore')}</AppText> : null}
          {browse.status === 'loadMoreError' ? (
            <Retry label={t('discover.loadMoreFailed')} action={t('discover.retry')} onPress={() => startBrowse('more', browse.page + 1)} />
          ) : null}
          {canLoadMore(browse) && browse.status === 'ready' ? (
            <Pressable accessibilityRole="button" onPress={() => startBrowse('more', browse.page + 1)} style={styles.more}>
              <AppText role="compactTitle" color={colors.sage}>{t('discover.loadMore')}</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <DiscoverFiltersSheet
        key={filtersOpen ? 'open' : 'closed'}
        visible={filtersOpen}
        draft={draft}
        countries={countries}
        cuisines={cuisines}
        dietaryTags={dietaryTags}
        previewTotal={typeof previewTotal === 'number' ? previewTotal : null}
        onChange={(next) => {
          setDraft(next);
          invalidatePreview();
        }}
        onReset={() => {
          setDraft(emptyDiscoverFilters());
          invalidatePreview();
        }}
        onApply={applyFilters}
        onClose={() => setFiltersOpen(false)}
        onRetryOptions={loadOptions}
      />
    </Screen>
  );
}

function Chip({
  label,
  selected,
  icon,
  expanded,
  onPress,
}: {
  label: string;
  selected?: boolean;
  icon?: boolean;
  expanded?: boolean;
  onPress: () => void;
}) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      aria-expanded={expanded}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipPlain, layout.style]}
      {...layout.props}
    >
      {icon ? <SlidersIcon /> : null}
      <AppText role="meta" block={false}>{label}</AppText>
    </Pressable>
  );
}

function Retry({ label, action, onPress }: { label: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.empty}>
      <AppText role="body">{label}</AppText>
      <Pressable accessibilityRole="button" onPress={onPress}>
        <AppText role="compactTitle" color={colors.sage}>{action}</AppText>
      </Pressable>
    </View>
  );
}

function recipeUrl(language: 'en' | 'ar', query: string, filters: DiscoverFilters, page: number): string {
  return `${apiBaseUrl}/recipes?${recipeSearchParams({ language, query, filters, page }).toString()}`;
}

async function readJson(url: string, signal: AbortSignal): Promise<unknown | null> {
  try {
    const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

function optionName(options: OptionState, slug: string | null): string | null {
  if (!slug || options === 'loading' || options === 'error') return null;
  return options.find((option) => option.slug === slug)?.name ?? null;
}

function recipeDetail(item: LiveRecipeCard, t: (key: string, values?: Record<string, unknown>) => string): string {
  const detail = t('home.detail', {
    minutes: item.totalTimeMinutes,
    difficulty: t(`home.difficulty.${item.difficulty}`),
  });
  return item.kicker.length > 0 ? `${item.kicker} · ${detail}` : detail;
}

function recipeNote(item: LiveRecipeCard, t: (key: string, values?: Record<string, unknown>) => string): string | undefined {
  const dietary = item.dietaryNames.join(' · ');
  const fallback = item.fallback ? t(`discover.fallback.${item.contentLanguage}`) : '';
  const note = [dietary, fallback].filter((part) => part.length > 0).join('\n');
  return note.length > 0 ? note : undefined;
}

const styles = StyleSheet.create({
  intro: {
    width: '100%',
    gap: 6,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D1D6C2',
    borderRadius: 16,
    backgroundColor: '#FEF9F0',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: colors.sageWash,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  chipPlain: {
    backgroundColor: colors.card,
  },
  results: {
    width: '100%',
    gap: 13,
  },
  empty: {
    width: '100%',
    gap: 8,
  },
  more: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
});
