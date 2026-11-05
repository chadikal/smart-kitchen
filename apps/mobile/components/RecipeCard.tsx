import { useTranslation } from 'react-i18next';
import { RecipePhotoView } from '@/components/RecipePhotoView';
import type { RecipePhoto } from '@/src/catalog/recipe-photo';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import type { AppLanguage } from '@/src/i18n/languages';
import { AppText } from '@/components/AppText';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

type RecipeCardProps = {
  photo?: RecipePhoto | null;
  slug: string;
  contentLanguage?: AppLanguage;
  variant: 'featured' | 'compact' | 'browse';
  title: string;
  kicker?: string;
  detail: string;
  note?: string;
  badge?: string;
};

export function RecipeCard(props: RecipeCardProps) {
  return (
    <Link href={{ pathname: '/recipe/[slug]', params: { slug: props.slug } }} asChild>
      <Pressable accessibilityRole="link" style={styles.link}>
        <RecipeCardContent {...props} />
      </Pressable>
    </Link>
  );
}

function RecipeCardContent({ variant, title, kicker, detail, note, badge, contentLanguage, photo }: RecipeCardProps) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);

  if (variant === 'featured') {
    return (
      <View {...layout.props} style={[styles.card, layout.style]}>
        {photo ? <RecipePhotoView photo={photo} title={title} /> : <View {...layout.props} style={[styles.featuredBand, layout.style]}>
          {badge ? (
            <View style={styles.badge}>
              <AppText role="eyebrow" block={false}>{badge}</AppText>
            </View>
          ) : null}
        </View>}
        <View style={styles.copy}>
          {kicker ? (
            <AppText role="eyebrow" color={colors.sage}>
              {kicker}
            </AppText>
          ) : null}
          <AppText role="featuredTitle" contentLanguage={contentLanguage}>{title}</AppText>
          {detail ? <AppText role="meta" color={colors.muted}>{detail}</AppText> : null}
          {note ? (
            <AppText role="meta" color={colors.sage}>
              {note}
            </AppText>
          ) : null}
        </View>
      </View>
    );
  }

  if (variant === 'browse') {
    return (
      <View {...layout.props} style={[styles.browse, layout.style]}>
        <RecipePhotoView photo={photo} title={title} variant="thumbnail" showCredit={false} />
        <View style={styles.browseCopy}>
          <AppText role="compactTitle" contentLanguage={contentLanguage}>{title}</AppText>
          {kicker ? <AppText role="meta" color={colors.muted}>{kicker}</AppText> : null}
          {detail ? <AppText role="meta" color={colors.muted}>{detail}</AppText> : null}
          {note ? <AppText role="meta" color={colors.sage}>{note}</AppText> : null}
          {photo ? <PhotoCredit name={photo.attribution} /> : null}
        </View>
      </View>
    );
  }

  return (
    <View {...layout.props} style={[styles.compact, layout.style]}>
      {photo ? <RecipePhotoView photo={photo} title={title} /> : null}
      <View style={styles.copy}>
        <AppText role="compactTitle" contentLanguage={contentLanguage}>{title}</AppText>
        {kicker ? (
          <AppText role="meta" color={colors.muted}>
            {kicker}
          </AppText>
        ) : null}
        {detail ? <AppText role="meta" color={colors.muted}>{detail}</AppText> : null}
        {note ? (
          <AppText role="meta" color={colors.sage}>
            {note}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function PhotoCredit({ name }: { name: string }) {
  const { t } = useTranslation();
  return <AppText role="eyebrow" color={colors.muted}>{t('recipe.photoCredit', { name })}</AppText>;
}

const styles = StyleSheet.create({
  browse: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 12, backgroundColor: colors.card, borderRadius: 22 },
  browseCopy: { flex: 1, minWidth: 0, gap: 5, paddingVertical: 2 },
  link: { width: '100%', alignSelf: 'stretch' },
  card: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 8,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  featuredBand: {
    minHeight: 72,
    borderRadius: radii.photo,
    backgroundColor: colors.sageWash,
    justifyContent: 'flex-end',
    padding: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  copy: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'stretch',
    gap: 5,
    paddingHorizontal: 8,
    paddingBottom: 9,
  },
  compact: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
});
