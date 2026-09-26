import AsyncStorage from '@react-native-async-storage/async-storage';
import { bridgeOrigin, cameraOrigin } from '../camera/config';
import type { CameraProfile, SavedCamera } from '../camera/types';

const key = 'plushycam.cameras.v1';
export async function readCameras(profiles: readonly CameraProfile[]): Promise<SavedCamera[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Saved camera settings could not be read.');
  return data.map((value) => {
    if (
      !value ||
      typeof value.id !== 'string' ||
      typeof value.profileId !== 'string' ||
      typeof value.nickname !== 'string' ||
      typeof value.host !== 'string'
    )
      throw new Error('Saved camera settings are invalid.');
    const camera = value as SavedCamera;
    const profile = profiles.find((p) => p.id === camera.profileId);
    if (profile) cameraOrigin(camera, profile);
    if (camera.browserBridge) bridgeOrigin(camera.browserBridge);
    return camera;
  });
}
export async function writeCameras(cameras: SavedCamera[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(cameras));
}
