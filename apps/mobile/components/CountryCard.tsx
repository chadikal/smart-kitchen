import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import type { SampleCountryCard } from '@/src/catalog/sample-recipes';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

const artwork = {
  italy: require('../assets/brand/italy.png'),
  japan: require('../assets/brand/japan.png'),
} as const;

const washes = [colors.blush, colors.sand, colors.sageWash] as const;

type CountryCardProps = {
  country: SampleCountryCard;
  countLabel: string;
  index: number;
};

export function CountryCard({ country, countLabel, index }: CountryCardProps) {
  const image = country.slug === 'italy' || country.slug === 'japan' ? artwork[country.slug] : null;

  return (
    <View style={[styles.card, { backgroundColor: washes[index % washes.length] }]}>
      {image ? (
        <Image
          source={image}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.art}
        />
      ) : (
        <View style={styles.artSpacer} />
      )}
      <AppText role="compactTitle" style={styles.center}>
        {country.name}
      </AppText>
      <AppText role="meta" color={colors.muted} style={styles.center}>
        {countLabel}
      </AppText>
    </View>
  );
}

export function CountryRow({ children }: { children: ReactNode }) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      {...layout.props}
      style={layout.style}
      contentContainerStyle={[styles.row, layout.style]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingVertical: 2,
  },
  card: {
    width: 112,
    minHeight: 124,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: 10,
    borderTopStartRadius: radii.countryTopStart,
    borderTopEndRadius: radii.countryTopEnd,
    borderBottomEndRadius: radii.countryBottomEnd,
    borderBottomStartRadius: radii.countryBottomStart,
  },
  art: {
    width: 72,
    height: 52,
  },
  artSpacer: {
    height: 52,
  },
  center: {
    textAlign: 'center',
  },
});
