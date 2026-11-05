import { qualifyFact } from '@/src/catalog/recipe-facts';
import { Link } from 'expo-router';
import { RecipePhotoView } from '@/components/RecipePhotoView';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { Heading } from '@/components/Heading';
import { instructionParagraphs, ingredientAmountText, type MeasuredUnit, type RecipeDetail } from '@/src/catalog/recipe-detail';
import { fontFamilyFor } from '@/src/fonts';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { localizeDigits } from '@/src/i18n/languages';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

export function RecipeDetailContent({ recipe, onTitleBottomChange }: {
  recipe: RecipeDetail;
  onTitleBottomChange?: (bottom: number) => void;
}) {
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const places = [...recipe.countries, ...recipe.cuisines];
  const description = recipe.description.trim();
  const facts: { label: string; value: string }[] = [];
  for (const [label, value] of [['prep', recipe.prepTimeMinutes], ['cook', recipe.cookTimeMinutes], ['total', recipe.totalTimeMinutes]] as const) {
    if (value !== null) facts.push({ label: t(`recipe.${label}`), value: qualifyFact(t('recipe.minutes', { count: value }), recipe.factSources?.[`${label}TimeMinutes`]) });
  }
  if (recipe.additionalTimeMinutes && recipe.additionalTimeMinutes > 0) facts.push({ label: t('recipe.rest'), value: qualifyFact(t('recipe.minutes', { count: recipe.additionalTimeMinutes }), recipe.factSources?.additionalTimeMinutes) });
  if (recipe.servings !== null) facts.push({ label: t('recipe.servings'), value: String(recipe.servings) });
  if (recipe.difficulty !== null) facts.push({ label: t(recipe.factSources?.difficulty === 'EDITORIAL' ? 'recipe.savoraDifficulty' : 'recipe.difficulty'), value: t(`home.difficulty.${recipe.difficulty}`) });
  const unitLabel = (unit: MeasuredUnit) => t(`recipe.units.${unit}`);

  return (
    <>
      <View style={styles.intro}>
        {places.length > 0 ? (
          <View {...layout.props} style={[styles.places, layout.style]}>
            {places.map((place, index) => (
              <View key={`${place.slug}-${index}`} {...layout.props} style={[styles.place, layout.style]}>
                {index > 0 ? (
                  <AppText role="eyebrow" block={false} color={colors.sage}>
                    /
                  </AppText>
                ) : null}
                <AppText role="eyebrow" block={false} color={colors.sage} contentLanguage={place.language}>
                  {place.name}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
        <View onLayout={onTitleBottomChange ? (event) => {
          const { y, height } = event.nativeEvent.layout;
          onTitleBottomChange(y + height);
        } : undefined}>
          <AppText role="display" accessibilityRole="header" contentLanguage={recipe.contentLanguage}>
            {recipe.title}
          </AppText>
        </View>
        {recipe.fallbackUsed ? (
          <AppText role="meta" color={colors.sage}>
            {t(`discover.fallback.${recipe.contentLanguage}`)}
          </AppText>
        ) : null}
        {description.length > 0 ? (
          <AppText role="body" color={colors.muted} contentLanguage={recipe.contentLanguage}>
            {description}
          </AppText>
        ) : null}
        {recipe.dietaryTags.length > 0 ? (
          <View {...layout.props} style={[styles.tags, layout.style]}>
            {recipe.dietaryTags.map((tag, index) => (
              <View key={`${tag.slug}-${index}`} style={styles.tag}>
                <AppText role="meta" block={false} contentLanguage={tag.language}>
                  {tag.name}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {recipe.photo ? <RecipePhotoView photo={recipe.photo} title={recipe.title} showCredit={!recipe.source || recipe.source.name !== recipe.photo.attribution} /> : null}
      {facts.length > 0 ? <View {...layout.props} style={[styles.facts, layout.style]}>
        {facts.map((fact) => <Fact key={fact.label} label={fact.label} value={fact.value} />)}
      </View> : null}

      {recipe.timingNote ? <AppText role="meta" color={colors.muted} contentLanguage={recipe.originalLanguage}>{recipe.timingNote}</AppText> : null}

      {recipe.ingredients.length > 0 ? (
        <View style={styles.section}>
          <Heading accessibilityRole="header">{t('recipe.ingredients')}</Heading>
          {recipe.ingredients.some((line) => line.sourceMeasure) ? <AppText role="meta" color={colors.muted}>{t('recipe.sourceMeasurements')}</AppText> : null}
          <View style={styles.card}>
            {recipe.ingredients.map((line, index) => {
              const amount = ingredientAmountText(line, { toTaste: t('recipe.toTaste'), unit: unitLabel });
              const last = index === recipe.ingredients.length - 1;
              return (
                <View
                  key={`${line.position}-${index}`}
                  {...layout.props}
                  style={[styles.line, layout.style, last ? styles.lineLast : null]}
                >
                  <View style={styles.lineCopy}>
                    <AppText role="compactTitle" contentLanguage={line.language}>
                      {line.name}
                    </AppText>
                    {line.optional ? (
                      <AppText role="meta" color={colors.muted}>
                        {t('recipe.optional')}
                      </AppText>
                    ) : null}
                    {line.note ? (
                      <AppText role="meta" color={colors.muted} contentLanguage={recipe.contentLanguage}>
                        {line.note}
                      </AppText>
                    ) : null}
                  </View>
                  {amount ? (
                    line.qualitativeAmount === 'TO_TASTE' ? (
                      <AppText role="meta" block={false} color={colors.sage}>
                        {amount}
                      </AppText>
                    ) : (
                      <MeasuredAmount text={amount} />
                    )
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {recipe.steps.length > 0 ? (
        <View style={styles.steps}>
          <Heading accessibilityRole="header">{t('recipe.steps')}</Heading>
          {recipe.steps.map((step, index) => (
            <View key={`${step.position}-${index}`} {...layout.props} style={[styles.step, layout.style]}>
              <View style={styles.stepNumber}>
                <AppText role="compactTitle" block={false} color={colors.sage}>
                  {String(step.position)}
                </AppText>
              </View>
              <View style={styles.stepCopy}>
                {instructionParagraphs(step.instruction).map((paragraph, paragraphIndex) => (
                  <AppText key={paragraphIndex} role="body" contentLanguage={recipe.contentLanguage}>{paragraph}</AppText>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {recipe.source ? <View style={styles.source}>
        <Link href={recipe.source.url as `https://${string}`} accessibilityRole="link"><AppText role="meta" color={colors.sage}>{t(recipe.photo?.attribution === recipe.source.name ? 'recipe.combinedCredit' : 'recipe.sourceCredit', { name: recipe.source.name })}</AppText></Link>
        {recipe.source.originalUrl ? <Link href={recipe.source.originalUrl as `https://${string}` | `http://${string}`} accessibilityRole="link"><AppText role="meta" color={colors.muted}>{t('recipe.originalSource')}</AppText></Link> : null}
      </View> : null}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText role="compactTitle" style={styles.factText}>
        {value}
      </AppText>
      <AppText role="meta" color={colors.muted} style={styles.factText}>
        {label}
      </AppText>
    </View>
  );
}

function MeasuredAmount({ text }: { text: string }) {
  const { language } = useAppLanguage();
  const ltr = layoutDirection('ltr');
  return (
    <View {...ltr.props} style={[styles.amount, ltr.style]}>
      <Text
        style={{
          color: colors.sage,
          fontFamily: fontFamilyFor(language, 'compactTitle'),
          fontSize: 12,
          lineHeight: 18,
          textAlign: 'left',
          writingDirection: 'ltr',
        }}
      >
        {localizeDigits(text, language)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    width: '100%',
    gap: 12,
  },
  places: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  facts: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.sageWash,
    borderRadius: radii.card,
    paddingHorizontal: 12,
    paddingVertical: 17,
  },
  fact: {
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: 88,
    gap: 4,
  },
  factText: {
    textAlign: 'center',
  },
  section: {
    width: '100%',
    gap: 14,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: 14,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lineLast: {
    borderBottomWidth: 0,
  },
  lineCopy: {
    flexGrow: 1,
    flexBasis: 160,
    gap: 2,
  },
  amount: {
    flexShrink: 1,
    maxWidth: '100%',
    paddingTop: 2,
  },
  steps: {
    width: '100%',
    gap: 23,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  stepNumber: {
    minWidth: 32,
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.sageWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: {
    flex: 1,
    gap: 12,
  },
  source: { gap: 8, width: '100%', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16 },
});
