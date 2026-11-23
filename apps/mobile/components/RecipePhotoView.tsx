import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import CookingPotIcon from '@/assets/brand/cooking-pot.svg';
import { AppText } from '@/components/AppText';
import type { RecipePhoto } from '@/src/catalog/recipe-photo';
import { colors, radii } from '@/src/theme/tokens';

type Props = { photo?: RecipePhoto | null; title: string; variant?: 'full' | 'thumbnail'; showCredit?: boolean };

export function RecipePhotoView({ photo, title, variant = 'full', showCredit = true }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { t } = useTranslation();
  const thumbnail = variant === 'thumbnail';
  const frame = thumbnail ? styles.thumbnail : styles.full;
  return (
    <View style={thumbnail ? styles.thumbnailContainer : styles.container}>
      {!photo || failedUrl === photo.url ? (
        <View style={[frame, styles.placeholder]}>
          <CookingPotIcon width={32} height={32} />
          {!thumbnail && photo ? <AppText role="meta">{t('recipe.photoUnavailable')}</AppText> : null}
        </View>
      ) : (
        <View style={[frame, styles.clip]}>
          <Image
            source={photo.localSource === undefined ? { uri: photo.url } : photo.localSource}
            accessibilityLabel={title}
            resizeMode="cover"
            style={styles.fill}
            onError={() => setFailedUrl(photo.url)}
          />
        </View>
      )}
      {photo && showCredit ? <AppText role="meta" color={colors.muted}>{t('recipe.photoCredit', { name: photo.attribution })}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 5 },
  thumbnailContainer: { width: 96, flexShrink: 0 },
  thumbnail: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.sageWash },
  full: { width: '100%', aspectRatio: 16 / 10, borderRadius: radii.photo, backgroundColor: colors.sageWash },
  clip: { overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 },
});
