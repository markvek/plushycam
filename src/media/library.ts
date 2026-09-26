import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { newMedia, type MediaInput, type SavedMedia } from './types';

const indexKey = 'plushycam.media.v1';
const folder = () => new Directory(Paths.document, 'plushycam');
let writes: Promise<unknown> = Promise.resolve();
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const next = writes.then(work, work);
  writes = next.catch(() => {});
  return next;
}
async function readIndex(): Promise<SavedMedia[]> {
  const raw = await AsyncStorage.getItem(indexKey);
  const records = raw ? (JSON.parse(raw) as SavedMedia[]) : [];
  // Reconstruct URIs: the application container path can change after an update.
  return records
    .map((item) => ({ ...item, uri: new File(folder(), `${item.id}.jpg`).uri }))
    .filter((item) => new File(item.uri).exists);
}
export async function listMedia(): Promise<SavedMedia[]> {
  return exclusive(async () => {
    const records = await readIndex();
    const dir = folder();
    if (dir.exists) {
      for (const entry of dir.list()) {
        if (entry instanceof File && entry.name.endsWith('.partial')) entry.delete();
      }
    }
    return records;
  });
}
export function saveMedia(bytes: Uint8Array, input: MediaInput): Promise<SavedMedia> {
  return exclusive(async () => {
    const record = newMedia(bytes, input);
    const dir = folder();
    dir.create({ intermediates: true, idempotent: true });
    const temporary = new File(dir, `${record.id}.partial`);
    const destination = new File(dir, `${record.id}.jpg`);
    try {
      temporary.write(bytes);
      temporary.move(destination);
      record.uri = destination.uri;
      const items = await readIndex();
      await AsyncStorage.setItem(indexKey, JSON.stringify([record, ...items]));
      return record;
    } catch {
      if (temporary.exists) temporary.delete();
      if (destination.exists) destination.delete();
      throw new Error('Could not save the snapshot. Check your available storage and try again.');
    }
  });
}
export function deleteMedia(item: SavedMedia): Promise<void> {
  return exclusive(async () => {
    const items = await readIndex();
    const file = new File(folder(), `${item.id}.jpg`);
    if (file.exists) file.delete();
    await AsyncStorage.setItem(
      indexKey,
      JSON.stringify(items.filter((record) => record.id !== item.id)),
    );
  });
}
export async function exportMedia(item: SavedMedia): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing is unavailable on this device.');
  const file = new File(folder(), `${item.id}.jpg`);
  if (!file.exists) throw new Error('This saved image is no longer on the device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', dialogTitle: 'Share snapshot' });
}
