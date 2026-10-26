import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, space } from '@/src/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  includeTopInset?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function Screen({ children, includeTopInset = false, refreshControl }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);

  return (
    <ScrollView
      {...layout.props}
      style={[styles.scroll, layout.style]}
      contentContainerStyle={[
        styles.content,
        layout.style,
        { paddingTop: includeTopInset ? insets.top + 6 : 16 },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      <View {...layout.props} style={[styles.column, layout.style]}>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingBottom: 28,
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
