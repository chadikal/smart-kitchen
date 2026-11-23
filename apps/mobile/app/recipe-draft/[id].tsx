import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowLeftIcon from '@/assets/brand/arrow-left.svg';
import { AppText } from '@/components/AppText';
import { RecipeDetailContent } from '@/components/RecipeDetailContent';
import { Screen } from '@/components/Screen';
import { DraftPhotoField } from '@/components/DraftPhotoField';
import type { RecipeDetail } from '@/src/catalog/recipe-detail';
import { draftPhoto } from '@/src/recipes/draft-photo';
import { useSession } from '@/src/auth/session-provider';
import { savedListOwner } from '@/src/recipes/saved';
import { loadDrafts, saveDrafts } from '@/src/recipes/draft-storage';
import { cleanDraft, draftError, measuredUnits, upsertDraft, type DraftIngredient, type DraftStep, type MeasuredUnit, type RecipeDraft } from '@/src/recipes/drafts';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { textAlignFor } from '@/src/i18n/languages';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii, space } from '@/src/theme/tokens';

function wholeNumber(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

function draftAsDetail(draft: RecipeDraft): RecipeDetail {
  const prep = wholeNumber(draft.prepMinutes);
  const cook = wholeNumber(draft.cookMinutes);
  const servings = wholeNumber(draft.servings);
  return {
    slug: draft.id,
    title: draft.title,
    description: draft.description,
    requestedLanguage: draft.language,
    contentLanguage: draft.language,
    fallbackUsed: false,
    originalLanguage: draft.language,
    photo: draftPhoto(draft.photoUri),
    source: null,
    difficulty: null,
    prepTimeMinutes: prep,
    cookTimeMinutes: cook,
    totalTimeMinutes: prep !== null && cook !== null ? prep + cook : null,
    servings: servings !== null && servings > 0 ? servings : null,
    countries: [],
    cuisines: [],
    dietaryTags: [],
    ingredients: draft.ingredients.filter((line) => line.name.trim()).map((line, index) => ({
      position: index + 1,
      ingredientSlug: line.id,
      name: line.name,
      language: draft.language,
      quantity: line.toTaste ? null : line.quantity,
      unit: line.toTaste ? null : line.unit,
      qualitativeAmount: line.toTaste ? 'TO_TASTE' as const : null,
      optional: false,
      note: null,
    })),
    steps: draft.steps.filter((step) => step.instruction.trim()).map((step, index) => ({
      position: index + 1,
      instruction: step.instruction,
    })),
  };
}

function blankDraft(language: 'en' | 'ar'): RecipeDraft {
  return {
    id: randomUUID(), language, title: '', description: '', prepMinutes: '', cookMinutes: '', servings: '',
    ingredients: [{ id: randomUUID(), name: '', quantity: '', unit: 'GRAM', toTaste: false }],
    steps: [{ id: randomUUID(), instruction: '' }], updatedAt: new Date().toISOString(),
  };
}

export default function RecipeDraftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const session = useSession();
  const owner = savedListOwner(session.status, session.profile?.id ?? null);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [baseline, setBaseline] = useState<RecipeDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitFor, setUnitFor] = useState<string | null>(null);

  useEffect(() => {
    if (!owner) return;
    const key = `${owner}|${id}`;
    if (loadedKey === key) return;
    let active = true;
    setLoading(true);
    setDraft(null);
    setError(null);
    void loadDrafts(owner).then((drafts) => {
      if (!active) return;
      const next = id === 'new' ? blankDraft(language) : drafts.find((item) => item.id === id) ?? null;
      setDraft(next);
      setBaseline(next);
      setEditing(false);
      setLoadedKey(key);
      setLoading(false);
    }).catch(() => {
      if (active) { setError(t('recipes.draftLoadError')); setLoadedKey(key); setLoading(false); }
    });
    return () => { active = false; };
  }, [id, language, loadedKey, owner, t]);

  const update = (patch: Partial<RecipeDraft>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const updateIngredient = (lineId: string, patch: Partial<DraftIngredient>) => {
    if (draft) update({ ingredients: draft.ingredients.map((line) => line.id === lineId ? { ...line, ...patch } : line) });
  };
  const updateStep = (stepId: string, patch: Partial<DraftStep>) => {
    if (draft) update({ steps: draft.steps.map((step) => step.id === stepId ? { ...step, ...patch } : step) });
  };

  const save = async () => {
    if (!draft || !owner || busy) return;
    const cleaned = cleanDraft(draft);
    const invalid = draftError(cleaned);
    if (invalid) { setError(t(`recipes.draftErrors.${invalid}`)); return; }
    setBusy(true);
    setError(null);
    try {
      const current = await loadDrafts(owner);
      const saved = { ...cleaned, updatedAt: new Date().toISOString() };
      await saveDrafts(owner, upsertDraft(current, saved));
      setDraft(saved);
      setBaseline(saved);
      setEditing(false);
      if (id === 'new') router.replace({ pathname: '/recipe-draft/[id]', params: { id: saved.id } });
    } catch {
      setError(t('recipes.draftSaveError'));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [styles.input, { textAlign: textAlignFor(direction, Platform.OS === 'web' ? 'web' : 'native-input'), writingDirection: direction }] as const;
  const showForm = id === 'new' || editing;

  const leave = () => {
    if (id !== 'new' && editing) {
      setDraft(baseline);
      setEditing(false);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/recipes');
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View {...layout.props} style={[styles.fill, layout.style, { paddingTop: insets.top }]}>
      <View {...layout.props} style={[styles.nav, layout.style]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('recipe.back')} onPress={leave} style={styles.back}>
          <View style={direction === 'rtl' ? styles.mirror : undefined}>
            <ArrowLeftIcon />
          </View>
        </Pressable>
        {draft && !showForm ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('recipes.edit')} onPress={() => setEditing(true)} style={styles.edit}>
            <AppText role="compactTitle" block={false} color={colors.sage}>{t('recipes.edit')}</AppText>
          </Pressable>
        ) : null}
      </View>
      <Screen includeBottomInset>
        {showForm ? <AppText role="display">{id === 'new' ? t('recipes.createTitle') : t('recipes.editTitle')}</AppText> : null}
        {showForm ? <AppText role="body" color={colors.muted}>{t('recipes.draftDeviceNote')}</AppText> : null}
        {loading || !owner ? <AppText role="body">{t('recipes.loading')}</AppText> : null}
        {!loading && !draft ? <AppText role="body">{error ?? t('recipes.draftLoadError')}</AppText> : null}
        {draft && !showForm ? (
          <RecipeDetailContent recipe={draftAsDetail(draft)} notice={t('recipes.draftStatus')} />
        ) : null}
        {draft && showForm ? (
          <>
            <DraftPhotoField draftId={draft.id} photoUri={draft.photoUri} onChange={(photoUri) => update({ photoUri })} />
            <Field label={t('recipes.form.title')} value={draft.title} onChangeText={(title) => update({ title })} style={inputStyle} maxLength={120} />
            <Field label={t('recipes.form.description')} value={draft.description} onChangeText={(description) => update({ description })} style={inputStyle} maxLength={600} multiline />
            <View {...layout.props} style={[styles.facts, layout.style]}>
              <Field label={t('recipes.form.prep')} value={draft.prepMinutes} onChangeText={(prepMinutes) => update({ prepMinutes })} style={styles.numeric} keyboardType="number-pad" maxLength={5} />
              <Field label={t('recipes.form.cook')} value={draft.cookMinutes} onChangeText={(cookMinutes) => update({ cookMinutes })} style={styles.numeric} keyboardType="number-pad" maxLength={5} />
              <Field label={t('recipes.form.servings')} value={draft.servings} onChangeText={(servings) => update({ servings })} style={styles.numeric} keyboardType="number-pad" maxLength={5} />
            </View>
            <AppText role="section">{t('recipe.ingredients')}</AppText>
            <AppText role="meta" color={colors.muted}>{t('recipes.form.amountHint')}</AppText>
            {draft.ingredients.map((line, index) => (
              <View key={line.id} style={styles.line}>
                <Field label={`${t('recipes.form.ingredient')} ${index + 1}`} value={line.name}
                  onChangeText={(name) => updateIngredient(line.id, { name })} style={inputStyle} maxLength={80} />
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: line.toTaste }} onPress={() => updateIngredient(line.id, { toTaste: !line.toTaste, quantity: '' })} style={styles.smallAction}>
                  <AppText role="compactTitle" block={false} color={colors.sage}>{line.toTaste ? '✓ ' : '○ '}{t('recipes.form.toTaste')}</AppText>
                </Pressable>
                {!line.toTaste ? <View {...layout.props} style={[styles.measurement, layout.style]}>
                  <Field label={t('recipes.form.quantity')} value={line.quantity}
                    onChangeText={(quantity) => updateIngredient(line.id, { quantity })} style={styles.numeric} keyboardType="decimal-pad" maxLength={13} />
                  <Pressable accessibilityRole="button" accessibilityLabel={t('recipes.form.unit')} onPress={() => setUnitFor(line.id)} style={styles.unitButton}>
                    <AppText role="meta">{t('recipes.form.unit')}</AppText>
                    <AppText role="compactTitle" block={false} color={colors.sage}>{t(`recipes.form.units.${line.unit}`)}</AppText>
                  </Pressable>
                </View> : null}
                {draft.ingredients.length > 1 ? <SmallAction label={t('recipes.form.removeIngredient')} onPress={() => update({ ingredients: draft.ingredients.filter((item) => item.id !== line.id) })} /> : null}
              </View>
            ))}
            <SmallAction label={t('recipes.form.addIngredient')} onPress={() => update({ ingredients: [...draft.ingredients, { id: randomUUID(), name: '', quantity: '', unit: 'GRAM', toTaste: false }] })} />
            <AppText role="section">{t('recipe.steps')}</AppText>
            {draft.steps.map((step, index) => (
              <View key={step.id} style={styles.line}>
                <Field label={`${t('recipes.form.step')} ${index + 1}`} value={step.instruction}
                  onChangeText={(instruction) => updateStep(step.id, { instruction })} style={inputStyle} maxLength={500} multiline />
                {draft.steps.length > 1 ? <SmallAction label={t('recipes.form.removeStep')} onPress={() => update({ steps: draft.steps.filter((item) => item.id !== step.id) })} /> : null}
              </View>
            ))}
            <SmallAction label={t('recipes.form.addStep')} onPress={() => update({ steps: [...draft.steps, { id: randomUUID(), instruction: '' }] })} />
            {error ? <AppText role="body" color={colors.sage}>{error}</AppText> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} style={styles.save} onPress={() => void save()}>
              <AppText role="compactTitle" block={false} color={colors.card}>{t('recipes.saveDraft')}</AppText>
            </Pressable>
          </>
        ) : null}
      </Screen>
      </View>
      <Modal visible={unitFor !== null} transparent animationType="slide" onRequestClose={() => setUnitFor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setUnitFor(null)}>
          <View style={styles.unitSheet}>
            <AppText role="section">{t('recipes.form.unit')}</AppText>
            <ScrollView contentContainerStyle={styles.unitOptions}>
              {measuredUnits.map((unit: MeasuredUnit) => <Pressable key={unit} accessibilityRole="button" onPress={() => { if (unitFor) updateIngredient(unitFor, { unit }); setUnitFor(null); }} style={styles.unitOption}>
                <AppText role="body">{t(`recipes.form.units.${unit}`)}</AppText>
              </Pressable>)}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChangeText, style, multiline, keyboardType, maxLength }: {
  label: string; value: string; onChangeText: (text: string) => void;
  style: object; multiline?: boolean; keyboardType?: 'number-pad' | 'decimal-pad'; maxLength: number;
}) {
  return <View style={styles.field}>
    <AppText role="meta">{label}</AppText>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline}
      keyboardType={keyboardType} maxLength={maxLength} style={[style, multiline ? styles.multiline : null]} />
  </View>;
}

function SmallAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.smallAction}>
    <AppText role="compactTitle" block={false} color={colors.sage}>{label}</AppText>
  </Pressable>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
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
  mirror: { transform: [{ scaleX: -1 }] },
  edit: {
    marginStart: 'auto',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.sage,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { flex: 1, gap: 8, minWidth: 0 },
  input: { minHeight: 52, backgroundColor: colors.card, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: radii.search, paddingHorizontal: 14, fontSize: 16 },
  numeric: { minHeight: 52, backgroundColor: colors.card, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: radii.search, paddingHorizontal: 10, fontSize: 16, textAlign: 'center' },
  multiline: { minHeight: 100, paddingTop: 14, textAlignVertical: 'top' },
  facts: { width: '100%', flexDirection: 'row', gap: 8 },
  line: { width: '100%', gap: 12, padding: 16, backgroundColor: colors.card, borderRadius: radii.card },
  measurement: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  unitButton: { flex: 1, minHeight: 52, justifyContent: 'center', gap: 4, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radii.search },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  unitSheet: { maxHeight: '70%', backgroundColor: colors.paper, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, padding: 20, gap: 12 },
  unitOptions: { gap: 8, paddingBottom: 24 },
  unitOption: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.card, borderRadius: radii.search },
  smallAction: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 8 },
  save: { minHeight: 54, width: '100%', borderRadius: radii.search, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center', marginBottom: space.section },
});
