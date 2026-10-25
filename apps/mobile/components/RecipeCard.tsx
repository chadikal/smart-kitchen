import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

type RecipeCardProps = {
  variant: 'featured' | 'compact';
  title: string;
  kicker?: string;
  detail: string;
  note?: string;
  badge?: string;
};

export function RecipeCard({ variant, title, kicker, detail, note, badge }: RecipeCardProps) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);

  if (variant === 'featured') {
    return (
      <View {...layout.props} style={[styles.card, layout.style]}>
        <View {...layout.props} style={[styles.featuredBand, layout.style]}>
          {badge ? (
            <View style={styles.badge}>
              <AppText role="eyebrow" block={false}>{badge}</AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.copy}>
          {kicker ? (
            <AppText role="eyebrow" color={colors.sage}>
              {kicker}
            </AppText>
          ) : null}
          <AppText role="featuredTitle">{title}</AppText>
          <AppText role="meta" color={colors.muted}>
            {detail}
          </AppText>
          {note ? (
            <AppText role="meta" color={colors.sage}>
              {note}
            </AppText>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View {...layout.props} style={[styles.compact, layout.style]}>
      <View style={styles.copy}>
        <AppText role="compactTitle">{title}</AppText>
        {kicker ? (
          <AppText role="meta" color={colors.muted}>
            {kicker}
          </AppText>
        ) : null}
        <AppText role="meta" color={colors.muted}>
          {detail}
        </AppText>
        {note ? (
          <AppText role="meta" color={colors.sage}>
            {note}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
