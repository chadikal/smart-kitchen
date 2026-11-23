import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { RecipePhotoView } from '@/components/RecipePhotoView';
import { draftPhoto } from '@/src/recipes/draft-photo';
import { discardDraftPhoto, persistDraftPhoto } from '@/src/recipes/draft-photo-store';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { layoutDirection } from '@/src/i18n/layout';
import { colors, radii } from '@/src/theme/tokens';

type Props = {
  draftId: string;
  photoUri: string | null | undefined;
  onChange: (photoUri: string | null) => void;
};

export function DraftPhotoField({ draftId, photoUri, onChange }: Props) {
  const { t } = useTranslation();
  const { direction } = useAppLanguage();
  const layout = layoutDirection(direction);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const photo = draftPhoto(photoUri);

  const pick = async (source: 'library' | 'camera') => {
    if (busy) return;
    setMessage(null);
    setBusy(true);
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(t(source === 'camera' ? 'recipes.photo.cameraDenied' : 'recipes.photo.libraryDenied'));
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (result.canceled || !result.assets[0]) return;
      const stored = await persistDraftPhoto(result.assets[0].uri, draftId);
      if (photoUri && photoUri !== stored) await discardDraftPhoto(photoUri);
      onChange(stored);
    } catch {
      setMessage(t('recipes.photo.unavailable'));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    setMessage(null);
    void discardDraftPhoto(photoUri);
    onChange(null);
  };

  return (
    <View style={styles.block}>
      {photo ? <RecipePhotoView photo={photo} title={t('recipes.photo.preview')} showCredit={false} /> : (
        <View style={styles.empty}>
          <AppText role="meta" color={colors.muted}>{t('recipes.photo.empty')}</AppText>
        </View>
      )}
      <View {...layout.props} style={[styles.actions, layout.style]}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void pick('library')} style={styles.action}>
          <AppText role="compactTitle" block={false} color={colors.sage}>
            {photo ? t('recipes.photo.replace') : t('recipes.photo.choose')}
          </AppText>
        </Pressable>
        {Platform.OS === 'web' ? null : (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void pick('camera')} style={styles.action}>
            <AppText role="compactTitle" block={false} color={colors.sage}>{t('recipes.photo.take')}</AppText>
          </Pressable>
        )}
        {photo ? (
          <Pressable accessibilityRole="button" onPress={remove} style={styles.action}>
            <AppText role="compactTitle" block={false} color={colors.sage}>{t('recipes.photo.remove')}</AppText>
          </Pressable>
        ) : null}
      </View>
      {message ? <AppText role="meta" color={colors.sage}>{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { width: '100%', gap: 8 },
  empty: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radii.photo,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.sage,
    backgroundColor: colors.card,
  },
});
