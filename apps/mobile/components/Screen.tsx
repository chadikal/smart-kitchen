import { useRef, useState, type ComponentRef, type ReactElement, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type RefreshControlProps, type ScrollViewProps } from 'react-native';
import ArrowLeftIcon from '@/assets/brand/arrow-left.svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, space } from '@/src/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  includeTopInset?: boolean;
  includeBottomInset?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  scrollHeader?: ReactNode;
  stickyHeader?: ReactNode;
  scrollToTopLabel?: string;
  onScroll?: ScrollViewProps['onScroll'];
};

export function Screen({
  children,
  includeTopInset = false,
  includeBottomInset = false,
  refreshControl,
  scrollHeader,
  stickyHeader,
  scrollToTopLabel,
  onScroll,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [showTop, setShowTop] = useState(false);
  const topVisibleRef = useRef(false);

  return (
    <View {...layout.props} style={[styles.scroll, layout.style, stickyHeader && includeTopInset ? { paddingTop: insets.top } : null]}>
      <ScrollView
        ref={scrollRef}
        {...layout.props}
        style={[styles.scroll, layout.style]}
        contentContainerStyle={[
          stickyHeader ? styles.stickyContent : styles.content,
          layout.style,
          {
            paddingTop: stickyHeader ? 0 : includeTopInset ? insets.top + 6 : 16,
            paddingBottom: 28 + (includeBottomInset ? insets.bottom : 0),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        stickyHeaderIndices={stickyHeader ? [scrollHeader ? 1 : 0] : undefined}
        contentInsetAdjustmentBehavior={stickyHeader ? 'never' : undefined}
        automaticallyAdjustContentInsets={stickyHeader ? false : undefined}
        scrollEventThrottle={32}
        onScroll={scrollToTopLabel || onScroll ? (event) => {
          onScroll?.(event);
          if (scrollToTopLabel) {
            const visible = event.nativeEvent.contentOffset.y > 120;
            if (topVisibleRef.current !== visible) {
              topVisibleRef.current = visible;
              setShowTop(visible);
            }
          }
        } : undefined}
      >
        {scrollHeader ? (
          <View style={styles.scrollHeading}>
            <View {...layout.props} style={[styles.column, layout.style]}>{scrollHeader}</View>
          </View>
        ) : null}
        {stickyHeader ? (
          <View style={styles.header}>
            <View {...layout.props} style={[styles.column, layout.style]}>{stickyHeader}</View>
          </View>
        ) : null}
        <View style={stickyHeader ? styles.results : undefined}>
          <View {...layout.props} style={[styles.column, layout.style]}>{children}</View>
        </View>
      </ScrollView>
      {scrollToTopLabel && showTop ? (
        <Pressable accessibilityRole="button" accessibilityLabel={scrollToTopLabel}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={[styles.toTop, { bottom: 16 + (includeBottomInset ? insets.bottom : 0) }]}>
          <View style={styles.upArrow}><ArrowLeftIcon /></View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.screen,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  scrollHeading: { paddingHorizontal: space.screen, paddingTop: 16, paddingBottom: 4 },
  stickyContent: { flexGrow: 1 },
  results: { paddingHorizontal: space.screen, paddingTop: 16 },
  toTop: {
    position: 'absolute', end: space.screen, width: 44, height: 44,
    borderRadius: 100, backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.line, alignItems: 'center', justifyContent: 'center',
  },
  upArrow: { transform: [{ rotate: '90deg' }] },
  scroll: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: space.screen,
    flexGrow: 1,
  },
  column: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'stretch',
    gap: space.section,
  },
});
