import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ArrowLeftIcon from '@/assets/brand/arrow-left.svg';
import { AppText } from '@/components/AppText';
import { RecipeDetailContent } from '@/components/RecipeDetailContent';
import { Screen } from '@/components/Screen';
import { apiBaseUrl } from '@/src/config/api';
import { isAbortError } from '@/src/catalog/discover';
import {
  detailViewAfterResponse,
  fetchRecipeDetail,
  loadPublicRecipeSlugs,
  recipeSlugFromParam,
  type DetailView,
  type SettledDetailView,
} from '@/src/catalog/recipe-detail';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors } from '@/src/theme/tokens';

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await loadPublicRecipeSlugs(apiBaseUrl);
  return slugs.map((slug) => ({ slug }));
}

export default function RecipeDetailScreen() {
  const params = useLocalSearchParams();
  const slug = recipeSlugFromParam(params.slug);
  const router = useRouter();
  const { language } = useAppLanguage();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; view: SettledDetailView } | null>(null);
  const requestIdRef = useRef(0);
  const requestKey = `${slug ?? ''}|${language}|${attempt}`;
  const view: DetailView = !slug
    ? { status: 'missing' }
    : settled?.key === requestKey
      ? settled.view
      : { status: 'loading' };

  useEffect(() => {
    if (!slug) return undefined;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    void fetchRecipeDetail(apiBaseUrl, slug, language, controller.signal)
      .then((result) => {
        const next = detailViewAfterResponse(
          { requestId: requestIdRef.current },
          { requestId, aborted: controller.signal.aborted, result },
        );
        if (next) setSettled({ key: requestKey, view: next });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        const next = detailViewAfterResponse(
          { requestId: requestIdRef.current },
          { requestId, aborted: controller.signal.aborted, result: { status: 'error' } },
        );
        if (next) setSettled({ key: requestKey, view: next });
      });
    return () => controller.abort();
  }, [attempt, language, requestKey, slug]);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/discover');
  }

  return <RecipePage key={`${slug ?? ''}|${language}`} view={view}
    canReturn={router.canGoBack()} onLeave={leave}
    onRetry={() => setAttempt((current) => current + 1)} />;
}

function RecipePage({ view, canReturn, onLeave, onRetry }: {
  view: DetailView;
  canReturn: boolean;
  onLeave: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const titleBottomRef = useRef(Number.POSITIVE_INFINITY);
  const scrollOffsetRef = useRef(0);
  const [showTitle, setShowTitle] = useState(false);
  const titleVisible = showTitle && view.status === 'ready';
  const titleProgress = useSharedValue(0);

  useEffect(() => {
    titleProgress.value = withTiming(titleVisible ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [titleProgress, titleVisible]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: (1 - titleProgress.value) * 6 }],
  }));
  const dividerStyle = useAnimatedStyle(() => ({ opacity: titleProgress.value }));

  return (
    <View {...layout.props} style={[styles.screen, layout.style, { paddingTop: insets.top }]}>
      <View style={styles.navFrame}>
        <View {...layout.props} style={[styles.nav, layout.style]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canReturn ? t('recipe.back') : t('recipe.toDiscover')}
            onPress={onLeave}
            style={styles.back}
          >
            <View style={direction === 'rtl' ? styles.mirror : undefined}>
              <ArrowLeftIcon />
            </View>
          </Pressable>
          {view.status === 'ready' ? (
            <Animated.View style={[styles.navTitle, titleStyle]} pointerEvents="none"
              accessibilityElementsHidden={!titleVisible}
              importantForAccessibility={titleVisible ? 'auto' : 'no-hide-descendants'}>
              <AppText role="compactTitle" numberOfLines={1} contentLanguage={view.recipe.contentLanguage}>
                {view.recipe.title}
              </AppText>
            </Animated.View>
          ) : null}
        </View>
        <Animated.View pointerEvents="none" style={[styles.navDivider, dividerStyle]} />
      </View>
      <Screen includeBottomInset onScroll={(event) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        setShowTitle(scrollOffsetRef.current >= titleBottomRef.current);
      }}>
        {view.status === 'loading' ? <Status>{t('recipe.loading')}</Status> : null}
        {view.status === 'error' ? (
          <Status
            action={t('discover.retry')}
            onAction={onRetry}
          >
            {t('recipe.unavailable')}
          </Status>
        ) : null}
        {view.status === 'missing' ? (
          <Status action={t('recipe.toDiscover')} href="/discover">
            {t('recipe.missing')}
          </Status>
        ) : null}
        {view.status === 'ready' ? <RecipeDetailContent recipe={view.recipe}
          onTitleBottomChange={(bottom) => {
            // Screen starts its normal content 16 points below the scroll viewport.
            titleBottomRef.current = bottom + 16;
            setShowTitle(scrollOffsetRef.current >= titleBottomRef.current);
          }} /> : null}
      </Screen>
    </View>
  );
}

function Status({
  children,
  action,
  onAction,
  href,
}: {
  children: string;
  action?: string;
  onAction?: () => void;
  href?: '/discover';
}) {
  const actionText = action ? (
    <AppText role="compactTitle" block={false} color={colors.sage}>
      {action}
    </AppText>
  ) : null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.status}>
      <AppText role="body">{children}</AppText>
      {action && href ? (
        <Link href={href} asChild>
          <Pressable accessibilityRole="link" style={styles.action}>
            {actionText}
          </Pressable>
        </Link>
      ) : null}
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          {actionText}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  nav: {
    width: '100%',
    maxWidth: 604,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  navFrame: {
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  navDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.line,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mirror: {
    transform: [{ scaleX: -1 }],
  },
  navTitle: {
    flex: 1,
    minWidth: 0,
  },
  status: {
    width: '100%',
    gap: 8,
  },
  action: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
});
