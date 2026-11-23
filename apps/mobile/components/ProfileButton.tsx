import { Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import UserIcon from '@/assets/brand/user-round.svg';
import { colors } from '@/src/theme/tokens';

export function ProfileButton() {
  const { t } = useTranslation();
  return (
    <Link href="/profile" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={t('tabs.profile')} style={styles.profile}>
        <UserIcon />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  profile: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
