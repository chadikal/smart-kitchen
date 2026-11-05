import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { discoverSorts, type DiscoverSort } from '@/src/catalog/discover';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

export function DiscoverSortSheet({ visible, value, onSelect, onClose }: {
  visible: boolean;
  value: DiscoverSort;
  onSelect: (sort: DiscoverSort) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={t('discover.closeSort')} onPress={onClose} />
        <View {...layout.props} accessibilityViewIsModal style={[styles.sheet, layout.style, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.heading, layout.style]}>
            <AppText role="compactTitle" block={false}>{t('discover.sort')}</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={t('discover.closeSort')} onPress={onClose} style={styles.close}>
              <AppText role="body" block={false}>×</AppText>
            </Pressable>
          </View>
          {discoverSorts.map((sort) => (
            <Pressable key={sort} accessibilityRole="radio" accessibilityState={{ selected: value === sort }}
              onPress={() => { onSelect(sort); onClose(); }}
              style={[styles.option, value === sort && styles.selected, layout.style]}>
              <AppText role="body" block={false}>{t(`discover.sortOptions.${sort}`)}</AppText>
              {value === sort ? <AppText role="body" block={false} color={colors.sage}>✓</AppText> : null}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(48, 61, 50, 0.28)' },
  backdrop: { flex: 1 },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, padding: 16, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  selected: { backgroundColor: colors.sageWash, borderColor: colors.sage },
});
