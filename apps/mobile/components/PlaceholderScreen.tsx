import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppLanguage } from '@/src/i18n/language-provider';

type PlaceholderScreenProps = {
  title: string;
  body: string;
};

export function PlaceholderScreen({ title, body }: PlaceholderScreenProps) {
  const { direction } = useAppLanguage();
  const textAlign = direction === 'rtl' ? 'right' : 'left';

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={[styles.title, { textAlign, writingDirection: direction }]}>
        {title}
      </Text>
      <Text variant="bodyLarge" style={{ textAlign, writingDirection: direction }}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontWeight: '600',
  },
});
