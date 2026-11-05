import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';

type HeadingProps = {
  children: string;
  action?: ReactNode;
  accessibilityRole?: 'header';
};

export function Heading({ children, action, accessibilityRole }: HeadingProps) {
  return (
    <View style={styles.row}>
      <View style={styles.title}>
        <AppText role="section" accessibilityRole={accessibilityRole}>{children}</AppText>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    alignItems: 'stretch',
  },
});
