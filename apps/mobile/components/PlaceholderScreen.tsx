import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';

type PlaceholderScreenProps = {
  title: string;
  body?: string;
};

export function PlaceholderScreen({ title, body }: PlaceholderScreenProps) {
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);

  return (
    <View {...layout.props} style={[styles.container, layout.style]}>
      <AppText role="section">{title}</AppText>
      {body ? <AppText role="body">{body}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
});
