import { openDB } from 'idb';
import { fromByteArray } from 'base64-js';
import { newMedia, type MediaInput, type SavedMedia } from './types';

function database() {
  return openDB('plushycam-media', 1, {
    upgrade(db) {
      db.createObjectStore('snapshots', { keyPath: 'id' });
    },
  });
}
export async function listMedia(): Promise<SavedMedia[]> {
  const db = await database();
  try {
    return ((await db.getAll('snapshots')) as SavedMedia[]).sort((a, b) =>
      b.savedAt.localeCompare(a.savedAt),
    );
  } finally {
    db.close();
  }
}
export async function saveMedia(bytes: Uint8Array, input: MediaInput): Promise<SavedMedia> {
  const record = newMedia(bytes, input);
  record.uri = `data:image/jpeg;base64,${fromByteArray(bytes)}`;
  const db = await database();
  try {
    await db.put('snapshots', record);
    return record;
  } catch {
    throw new Error('Browser storage is full or unavailable. Free some space, then retry.');
  } finally {
    db.close();
  }
}
export async function deleteMedia(item: SavedMedia): Promise<void> {
  const db = await database();
  try {
    await db.delete('snapshots', item.id);
  } finally {
    db.close();
  }
}
export async function exportMedia(item: SavedMedia): Promise<void> {
  const link = document.createElement('a');
  link.href = item.uri;
  link.download = `plushycam-${item.savedAt.replace(/[:.]/g, '-')}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
