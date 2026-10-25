import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import BotanicalSprig from '@/assets/brand/botanical-sprig.svg';
import HeartIcon from '@/assets/brand/heart.svg';
import SproutIcon from '@/assets/brand/sprout.svg';
import UserIcon from '@/assets/brand/user-round.svg';
import { AppText } from '@/components/AppText';
import { CountryCard, CountryRow } from '@/components/CountryCard';
import { Heading } from '@/components/Heading';
import { RecipeCard } from '@/components/RecipeCard';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { apiBaseUrl } from '@/src/config/api';
import { fetchLiveRecipes, type LiveRecipeResult } from '@/src/catalog/live-recipes';
import {
  sampleCountryCards,
  sampleKicker,
  sampleRecipes,
  sampleSearchLayout,
  sampleTitle,
  sampleTotalMinutes,
  type SampleDifficulty,
  type SampleLanguage,
  type SampleRecipe,
} from '@/src/catalog/sample-recipes';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { colors } from '@/src/theme/tokens';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const [query, setQuery] = useState('');
  const [live, setLive] = useState<LiveRecipeResult | 'loading'>('loading');
  const hour = new Date().getHours();
  const eyebrow =
    hour < 12 ? t('home.morning') : hour < 17 ? t('home.afternoon') : t('home.evening');
  const samples = sampleSearchLayout(sampleRecipes, language, query);
  const featuredTitle = samples.featured ? sampleTitle(samples.featured, language) : undefined;
  const searching = query.trim().length > 0;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLive('loading');
      void fetchLiveRecipes(apiBaseUrl, language, query, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setLive(result);
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          if (!controller.signal.aborted) setLive({ ok: false });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [language, query]);

  return (
    <Screen includeTopInset>
      <View style={styles.brandRow}>
        <View style={styles.wordmark}>
          <SproutIcon />
          <AppText role="wordmark" block={false} style={styles.wordmarkText}>
            savora
          </AppText>
        </View>
        <View accessibilityLabel={t('home.guest')} style={styles.guest}>
          <AppText role="meta" block={false} color={colors.muted}>
            {t('home.guest')}
          </AppText>
          <View style={styles.guestMark}>
            <UserIcon />
          </View>
        </View>
      </View>

      <View style={styles.welcome}>
        <View style={styles.greeting}>
          <AppText role="eyebrow" color={colors.sage}>
            {eyebrow}
          </AppText>
          <AppText role="display">{t('home.greeting')}</AppText>
        </View>
        <BotanicalSprig />
      </View>

      <SearchField
        value={query}
        onChangeText={setQuery}
        label={t('home.searchLabel')}
        placeholder={t('home.searchPlaceholder')}
      />

      {samples.featured && featuredTitle ? (
        <View style={styles.section}>
          <Heading>{t('home.featuredHeading')}</Heading>
          <RecipeCard
            variant="featured"
            badge={t('home.sampleBadge')}
            title={featuredTitle.title}
            kicker={sampleKicker(samples.featured, language)}
            detail={detail(t, samples.featured)}
            note={sampleFallbackNote(t, featuredTitle)}
          />
        </View>
      ) : null}

      {searching ? null : (
        <View style={styles.section}>
          <Heading>{t('home.placesHeading')}</Heading>
          <CountryRow>
            {sampleCountryCards(language).map((country, index) => (
              <CountryCard
                key={country.slug}
                country={country}
                index={index}
                countLabel={t('home.sampleCount', { count: country.recipeCount })}
              />
            ))}
          </CountryRow>
        </View>
      )}

      {samples.showSampleList || samples.showEmpty ? (
        <View style={styles.section}>
          <Heading>{t('home.sampleHeading')}</Heading>
          <AppText role="meta" color={colors.muted}>
            {t('home.sampleNote')}
          </AppText>
          {samples.showEmpty ? (
            <AppText role="body">{t('home.sampleEmpty')}</AppText>
          ) : (
            samples.rest.map((recipe) => {
              const title = sampleTitle(recipe, language);
              return (
                <RecipeCard
                  key={recipe.slug}
                  variant="compact"
                  title={title.title}
                  kicker={sampleKicker(recipe, language)}
                  detail={detail(t, recipe)}
                  note={sampleFallbackNote(t, title)}
                />
              );
            })
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Heading>{t('home.liveHeading')}</Heading>
        <LiveRecipes
          live={live}
          emptyLabel={t('home.liveEmpty')}
          unavailableLabel={t('home.liveUnavailable')}
          checkingLabel={t('home.liveChecking')}
          moreLabel={(shown, total) => t('home.liveMore', { shown, total })}
          fallbackNote={(contentLanguage) => t(`home.liveFallback.${contentLanguage}`)}
          detailFor={(minutes, difficulty) =>
            t('home.detail', { minutes, difficulty: t(`home.difficulty.${difficulty}`) })
          }
        />
      </View>

      <View style={styles.note}>
        <HeartIcon />
        <View style={styles.noteText}>
          <AppText role="meta">{t('home.welcomeNote')}</AppText>
        </View>
      </View>
    </Screen>
  );
}

function sampleFallbackNote(
  t: (key: string) => string,
  title: { fallback: boolean; contentLanguage: SampleLanguage },
): string | undefined {
  return title.fallback ? t(`home.sampleFallback.${title.contentLanguage}`) : undefined;
}

function detail(t: (key: string, options?: Record<string, unknown>) => string, recipe: SampleRecipe): string {
  return t('home.detail', {
    minutes: sampleTotalMinutes(recipe),
    difficulty: t(`home.difficulty.${recipe.difficulty}`),
  });
}

function LiveRecipes({
  live,
  checkingLabel,
  unavailableLabel,
  emptyLabel,
  moreLabel,
  fallbackNote,
  detailFor,
}: {
  live: LiveRecipeResult | 'loading';
  checkingLabel: string;
  unavailableLabel: string;
  emptyLabel: string;
  moreLabel: (shown: number, total: number) => string;
  fallbackNote: (contentLanguage: 'en' | 'ar') => string;
  detailFor: (minutes: number, difficulty: SampleDifficulty) => string;
}) {
  if (live === 'loading') return <AppText role="meta" color={colors.muted}>{checkingLabel}</AppText>;
  if (!live.ok) return <AppText role="body">{unavailableLabel}</AppText>;
  if (live.items.length === 0) return <AppText role="body">{emptyLabel}</AppText>;
  return (
    <View style={styles.section}>
      {live.items.map((recipe) => (
        <RecipeCard
          key={recipe.slug}
          variant="compact"
          title={recipe.title}
          kicker={recipe.kicker}
          detail={detailFor(recipe.totalTimeMinutes, recipe.difficulty)}
          note={recipe.fallback ? fallbackNote(recipe.contentLanguage) : undefined}
        />
      ))}
      {live.total > live.items.length ? (
        <AppText role="meta" color={colors.muted}>
          {moreLabel(live.items.length, live.total)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  guest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
  },
  guestMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageWash,
  },
  welcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    flex: 1,
    alignItems: 'stretch',
    gap: 9,
  },
  section: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'stretch',
    gap: 13,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.sageWash,
    borderRadius: 14,
    padding: 13,
  },
  noteText: {
    flex: 1,
    alignItems: 'stretch',
  },
  wordmarkText: {
    writingDirection: 'ltr',
  },
});
