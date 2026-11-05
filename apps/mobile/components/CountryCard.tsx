import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Link } from 'expo-router';
import FranceArt from '@/assets/brand/france.svg';
import LebanonArt from '@/assets/brand/lebanon.svg';
import MexicoArt from '@/assets/brand/mexico.svg';
import ItalyArt from '@/assets/brand/italy.svg';
import JapanArt from '@/assets/brand/japan.svg';
import CookingPotIcon from '@/assets/brand/cooking-pot.svg';
import type { CatalogOption } from '@/src/catalog/discover';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

// Representative foods, rather than flags or claims of exclusive origin.
const artwork = new Map<string, ReactNode>([
  ['france', <FranceArt key="france" />], // baguette
  ['italy', <ItalyArt key="italy" />], // penne with tomato and basil
  ['japan', <JapanArt key="japan" />], // salmon nigiri
  ['lebanon', <LebanonArt key="lebanon" />], // hummus
  ['mexico', <MexicoArt key="mexico" />], // taco
]);

const washes = [colors.blush, colors.sand, colors.sageWash] as const;

type CountryCardProps = {
  country: CatalogOption;
  countLabel: string;
  index: number;
};

export function CountryCard({ country, countLabel, index }: CountryCardProps) {
  return (
    <Link href={{ pathname: '/discover', params: { country: country.slug, q: '' } }} asChild>
    <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.card, { backgroundColor: washes[index % washes.length] }])}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.illustration}>
        {artwork.get(country.slug) ?? <CookingPotIcon />}
      </View>
      <AppText role="compactTitle" contentLanguage={country.language} style={styles.center}>
        {country.name}
      </AppText>
      <AppText role="meta" color={colors.muted} style={styles.center}>
        {countLabel}
      </AppText>
    </Pressable>
    </Link>
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
  illustration: {
    width: 72,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
