export type SavedMedia = {
  id: string;
  savedCameraId: string;
  profileId: string;
  cameraName: string;
  sourceKind: 'camera-snapshot';
  savedAt: string;
  size: number;
  uri: string;
};
export type MediaInput = Omit<SavedMedia, 'id' | 'savedAt' | 'size' | 'uri' | 'sourceKind'>;

export function newMedia(bytes: Uint8Array, input: MediaInput): SavedMedia {
  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    sourceKind: 'camera-snapshot',
    savedAt: new Date().toISOString(),
    size: bytes.length,
    uri: '',
  };
}
