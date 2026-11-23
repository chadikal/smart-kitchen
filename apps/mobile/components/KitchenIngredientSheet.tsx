import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { SearchField } from '@/components/SearchField';
import { filterKitchenIngredients } from '@/src/kitchen/catalog';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

export function KitchenIngredientSheet({
  visible,
  selected,
  onToggle,
  onReset,
  onClose,
}: {
  visible: boolean;
  selected: readonly string[];
  onToggle: (slug: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { language, direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const ingredients = filterKitchenIngredients(query, language);
  const canReset = selected.length > 0;
  const windowHeight = Dimensions.get('window').height;
  const lift = visible ? keyboardHeight : 0;
  const sheetMaxHeight = Math.min(windowHeight * 0.78, windowHeight - lift - 12);

  useEffect(() => {
    if (!visible) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setKeyboardHeight(0);
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={t('kitchen.done')} onPress={onClose} />
        <View
          {...layout.props}
          accessibilityViewIsModal
          style={[styles.sheet, layout.style, {
            paddingBottom: Math.max(insets.bottom, 16),
            maxHeight: sheetMaxHeight,
            marginBottom: lift,
          }]}
        >
          <View {...layout.props} style={[styles.heading, layout.style]}>
            <AppText role="compactTitle" block={false}>{t('kitchen.add')}</AppText>
            <View {...layout.props} style={[styles.headingActions, layout.style]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('kitchen.reset')}
                accessibilityState={{ disabled: !canReset }}
                disabled={!canReset}
                onPress={onReset}
                style={styles.close}
              >
                <AppText role="meta" block={false} color={canReset ? colors.sage : colors.muted}>{t('kitchen.reset')}</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('kitchen.done')} onPress={onClose} style={styles.close}>
                <AppText role="meta" block={false} color={colors.sage}>{t('kitchen.done')}</AppText>
              </Pressable>
            </View>
          </View>
          <SearchField
            value={query}
            onChangeText={setQuery}
            label={t('kitchen.searchLabel')}
            placeholder={t('kitchen.searchPlaceholder')}
            clearLabel={t('discover.clearSearch')}
            onClear={() => setQuery('')}
          />
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.list}
          >
            {ingredients.length === 0 ? (
              <AppText role="body" color={colors.muted}>{t('kitchen.noSearch')}</AppText>
            ) : ingredients.map((ingredient) => {
              const active = selected.includes(ingredient.slug);
              return (
                <Pressable
                  key={ingredient.slug}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onToggle(ingredient.slug)}
                  style={[styles.option, layout.style, active ? styles.optionOn : styles.optionOff]}
                  {...layout.props}
                >
                  <AppText role="body" block={false} color={active ? colors.card : colors.ink} style={styles.optionName}>
                    {ingredient.names[language]}
                  </AppText>
                  {active ? (
                    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                      <AppText role="body" block={false} color={colors.card}>✓</AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(48, 61, 50, 0.28)' },
  backdrop: { flex: 1 },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 12 },
  headingActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  list: { gap: 8, paddingBottom: 8 },
  option: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: 12,
  },
  optionName: { flexShrink: 1 },
  optionOff: { backgroundColor: colors.card, borderColor: colors.line },
  optionOn: { backgroundColor: colors.sage, borderColor: colors.sage },
});
