import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
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
import { recipeFactsText, fetchHomeRecipes, fetchLiveRecipes, type LiveRecipeResult, type LiveRecipeCard } from '@/src/catalog/live-recipes';
import { readCatalogOptions, type CatalogOption } from '@/src/catalog/discover';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { colors } from '@/src/theme/tokens';

type RecipeSnapshot = { key: string; context: string; result: LiveRecipeResult };
type CountrySnapshot = { language: string; result: CatalogOption[] | null };

export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<RecipeSnapshot | null>(null);
  const [countrySnapshot, setCountrySnapshot] = useState<CountrySnapshot | null>(null);
  const [countryAttempt, setCountryAttempt] = useState(0);
  const context = JSON.stringify([language, query.trim()]);
  const key = JSON.stringify([context, attempt]);
  const live = snapshot?.key === key ? snapshot.result : 'loading';
  const countries = countrySnapshot?.language === language ? countrySnapshot.result : 'loading';
  const hour = new Date().getHours();
  const eyebrow = hour < 12 ? t('home.morning') : hour < 17 ? t('home.afternoon') : t('home.evening');
  const items = live !== 'loading' && live.ok ? live.items : [];
  const home = live !== 'loading' && live.ok ? live.home : undefined;
  const featured = home?.featured;
  const rest = home ? home.more : items;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (query.trim() ? fetchLiveRecipes(apiBaseUrl, language, query, controller.signal) : fetchHomeRecipes(apiBaseUrl, language, controller.signal))
        .then((result) => { if (!controller.signal.aborted) setSnapshot({ key, context, result }); })
        .catch(() => { if (!controller.signal.aborted) setSnapshot({ key, context, result: { ok: false } }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [language, query, key, context]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/countries?lang=${language}`, { signal: controller.signal })
      .then(async (response) => response.ok ? readCatalogOptions(await response.json()) : null)
      .then((result) => { if (!controller.signal.aborted) setCountrySnapshot({ language, result }); })
      .catch(() => { if (!controller.signal.aborted) setCountrySnapshot({ language, result: null }); });
    return () => controller.abort();
  }, [language, countryAttempt]);

  const retry = () => setAttempt((value) => value + 1);
  const browseHref = { pathname: '/discover' as const, params: { q: query.trim(), country: '' } };
  const card = (recipe: LiveRecipeCard, variant: 'featured' | 'browse') => (
    <RecipeCard key={recipe.slug} slug={recipe.slug} contentLanguage={recipe.contentLanguage} photo={recipe.photo}
      variant={variant} title={recipe.title} kicker={recipe.kicker}
      badge={variant === 'featured' ? t('home.recipeBadge') : undefined}
      detail={recipeFactsText(recipe, t)}
      note={recipe.fallback ? t(`home.liveFallback.${recipe.contentLanguage}`) : undefined} />
  );

  return (
    <Screen includeTopInset refreshControl={<RefreshControl refreshing={live === 'loading' && snapshot?.context === context} onRefresh={retry} tintColor={colors.sage} />}>
      <View style={styles.brandRow}>
        <View style={styles.wordmark}><SproutIcon /><AppText role="wordmark" block={false} style={styles.wordmarkText}>savora</AppText></View>
        <Link href="/profile" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={t('tabs.profile')} style={styles.guest}>
            <AppText role="meta" block={false} color={colors.muted}>{t('home.guest')}</AppText>
            <View style={styles.guestMark}><UserIcon /></View>
          </Pressable>
        </Link>
      </View>
      <View style={styles.welcome}>
        <View style={styles.greeting}>
          <AppText role="eyebrow" color={colors.sage}>{eyebrow}</AppText>
          <AppText role="display">{t('home.greeting')}</AppText>
        </View>
        <BotanicalSprig />
      </View>
      <SearchField value={query} onChangeText={setQuery} label={t('home.searchLabel')} placeholder={t('home.searchPlaceholder')}
        onClear={() => setQuery('')} clearLabel={t('discover.clearSearch')} />
      {live === 'loading' ? <AppText role="body">{t('home.liveChecking')}</AppText> : !live.ok ? (
        <View style={styles.section}>
          <AppText role="body">{t('home.liveUnavailable')}</AppText>
          <Pressable accessibilityRole="button" onPress={retry} style={styles.action}><AppText role="compactTitle" block={false} color={colors.sage}>{t('discover.retry')}</AppText></Pressable>
        </View>
      ) : live.items.length === 0 ? <AppText role="body">{t('home.liveEmpty')}</AppText> : featured ? (
        <View style={styles.section}><Heading>{t('home.featuredHeading')}</Heading>{card(featured, 'featured')}</View>
      ) : null}
      {home && home.picks.length > 0 ? <View style={styles.section}><Heading>{t('home.picksHeading')}</Heading>{home.picks.map((recipe) => card(recipe, 'browse'))}</View> : null}
      {home && home.quick.length > 0 ? <View style={styles.section}><Heading>{t('home.quickHeading')}</Heading>{home.quick.map((recipe) => card(recipe, 'browse'))}</View> : null}
      {!query.trim() ? (
        <View style={styles.section}>
          <Heading>{t('home.placesHeading')}</Heading>
          {countries === 'loading' ? <AppText role="meta">{t('home.countriesLoading')}</AppText> : countries === null ? (
            <Pressable accessibilityRole="button" onPress={() => setCountryAttempt((value) => value + 1)} style={styles.action}>
              <AppText role="meta" color={colors.sage}>{t('home.countriesRetry')}</AppText>
            </Pressable>
          ) : countries.length > 0 ? (
            <CountryRow>{countries.map((country, index) => <CountryCard key={country.slug} country={country} index={index} countLabel={t('home.exploreCountry')} />)}</CountryRow>
          ) : <AppText role="meta">{t('home.countriesEmpty')}</AppText>}
        </View>
      ) : null}
      {rest.length > 0 ? <View style={styles.section}><Heading>{t(query.trim() ? 'home.searchResults' : 'home.catalogHeading')}</Heading>{rest.map((recipe) => card(recipe, 'browse'))}</View> : null}
      <Link href={browseHref} asChild>
        <Pressable accessibilityRole="link" style={styles.action}><AppText role="compactTitle" block={false} color={colors.sage}>{t(query.trim() ? 'home.browseResults' : 'home.browseAll')}</AppText></Pressable>
      </Link>
      <View style={styles.note}><HeartIcon /><View style={styles.noteText}><AppText role="meta">{t('home.welcomeNote')}</AppText></View></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
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
