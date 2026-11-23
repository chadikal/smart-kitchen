import { copyAsync, deleteAsync, documentDirectory, makeDirectoryAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

function folder(): string | null {
  return documentDirectory ? `${documentDirectory}draft-photos/` : null;
}

/** Keep a picked photo after the picker deletes its temporary file. Web stores a data URL. */
export async function persistDraftPhoto(uri: string, draftId: string): Promise<string> {
  if (uri.startsWith('data:') || uri.startsWith('savora-draft://')) return uri;
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('photo'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  }
  const root = folder();
  if (!root) return uri;
  await makeDirectoryAsync(root, { intermediates: true });
  const dest = `${root}${draftId}.jpg`;
  await deleteAsync(dest, { idempotent: true }).catch(() => undefined);
  await copyAsync({ from: uri, to: dest });
  return dest;
}

export async function discardDraftPhoto(uri: string | null | undefined): Promise<void> {
  const root = folder();
  if (!uri || !root || !uri.startsWith(root)) return;
  await deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}
