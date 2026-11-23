export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const maxChunkBytes = 1800;

export function splitUtf8(value: string, maxBytes = maxChunkBytes): string[] {
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;
  const encoder = new TextEncoder();
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (current && bytes + size > maxBytes) {
      chunks.push(current);
      current = character;
      bytes = size;
    } else {
      current += character;
      bytes += size;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [''];
}

/** Stores session strings in bounded pieces so SecureStore's size limit is not exceeded. */
export function createChunkedStorage(backend: KeyValueStore): KeyValueStore {
  return {
    async getItem(key) {
      const count = Number(await backend.getItem(`${key}.count`));
      if (!Number.isInteger(count) || count < 1) return null;
      const parts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const part = await backend.getItem(`${key}.${index}`);
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      const previous = Number(await backend.getItem(`${key}.count`));
      const chunks = splitUtf8(value);
      await backend.setItem(`${key}.count`, String(chunks.length));
      await Promise.all(chunks.map((chunk, index) => backend.setItem(`${key}.${index}`, chunk)));
      if (Number.isInteger(previous) && previous > chunks.length) {
        await Promise.all(
          Array.from({ length: previous - chunks.length }, (_, index) => backend.removeItem(`${key}.${chunks.length + index}`)),
        );
      }
    },
    async removeItem(key) {
      const count = Number(await backend.getItem(`${key}.count`));
      const removals = [backend.removeItem(`${key}.count`)];
      if (Number.isInteger(count) && count > 0) {
        for (let index = 0; index < count; index += 1) removals.push(backend.removeItem(`${key}.${index}`));
      }
      await Promise.all(removals);
    },
  };
}
