import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState, Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { cameraProfiles } from '../../cameras.config';
import { bridgeOrigin, cameraOrigin, validateProfiles } from '../camera/config';
import { createAdapter } from '../camera/adapterRegistry';
import { CameraSession } from '../camera/CameraSession';
import type { SavedCamera } from '../camera/types';
import { readCameras, writeCameras } from '../storage/cameras';
import { deleteMedia, exportMedia, listMedia, saveMedia } from '../media/library';
import type { SavedMedia } from '../media/types';

validateProfiles(cameraProfiles);

function useCameraModel() {
  const [session] = useState(() => new CameraSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [cameras, setCameras] = useState<SavedCamera[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [media, setMedia] = useState<SavedMedia[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [checkingBridge, setCheckingBridge] = useState(false);
  const connectionRequest = useRef(0);
  const bridgeRequest = useRef<AbortController | undefined>(undefined);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const currentCameras = useRef(cameras);
  const selected = cameras.find((camera) => camera.id === selectedId);
  const profile = cameraProfiles.find((p) => p.id === selected?.profileId);

  const cancelPendingConnection = useCallback(() => {
    connectionRequest.current++;
    bridgeRequest.current?.abort();
    bridgeRequest.current = undefined;
  }, []);
  const disconnect = useCallback(async () => {
    cancelPendingConnection();
    setCheckingBridge(false);
    await session.disconnect();
  }, [session, cancelPendingConnection]);

  useEffect(() => {
    let mounted = true;
    void Promise.allSettled([readCameras(cameraProfiles), listMedia()]).then(([devices, saved]) => {
      if (!mounted) return;
      if (devices.status === 'fulfilled') {
        setCameras(devices.value);
        currentCameras.current = devices.value;
        setSelectedId(devices.value[0]?.id);
      }
      if (saved.status === 'fulfilled') setMedia(saved.value);
      if (devices.status === 'rejected' || saved.status === 'rejected')
        setNotice('Some saved data could not be loaded. Check that local storage is available.');
      setReady(true);
    });
    return () => {
      mounted = false;
      cancelPendingConnection();
      void session.disconnect();
    };
  }, [session, cancelPendingConnection]);

  // Live streaming is intentionally foreground-only. No background-transfer claims.
  useEffect(() => {
    const pause = () => {
      if (session.getSnapshot().connection !== 'disconnected' || bridgeRequest.current) {
        void disconnect();
        setNotice('Live view paused while the app was away. Connect again when you’re ready.');
      }
    };
    const subscription = AppState.addEventListener('change', (value) => {
      if (value !== 'active') pause();
    });
    const visibility = () => {
      if (document.hidden) pause();
    };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility);
    };
  }, [session, disconnect]);

  const mutateCameras = useCallback((change: (items: SavedCamera[]) => SavedCamera[]) => {
    const run = writes.current.then(async () => {
      const updated = change(currentCameras.current);
      await writeCameras(updated);
      currentCameras.current = updated;
      setCameras(updated);
    });
    writes.current = run.catch(() => {});
    return run;
  }, []);

  async function saveCamera(camera: SavedCamera) {
    await disconnect();
    await mutateCameras((items) => [...items.filter((item) => item.id !== camera.id), camera]);
    setSelectedId(camera.id);
    setNotice('Camera saved. You’re ready to connect.');
  }
  async function removeCamera(id: string) {
    await disconnect();
    await mutateCameras((items) => items.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(currentCameras.current[0]?.id);
    setNotice('Camera removed. Your saved images are still here.');
  }
  async function selectCamera(id: string) {
    await disconnect();
    setSelectedId(id);
  }
  async function connect() {
    if (!selected || !profile) return;
    const request = ++connectionRequest.current;
    bridgeRequest.current?.abort();
    setNotice(undefined);
    const origin =
      Platform.OS === 'web' && selected.browserBridge
        ? bridgeOrigin(selected.browserBridge)
        : undefined;
    if (origin) {
      const controller = new AbortController();
      bridgeRequest.current = controller;
      setCheckingBridge(true);
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await expoFetch(`${origin}/__bridge`, { signal: controller.signal });
        const info = await response.json();
        if (!response.ok || info.cameraOrigin !== cameraOrigin(selected, profile))
          throw new Error(
            'The browser bridge points to a different camera. Restart it with this camera’s address.',
          );
      } catch (error) {
        if (request !== connectionRequest.current) return;
        if (error instanceof Error && error.message.includes('different camera')) throw error;
        throw new Error(
          'Cannot reach the browser bridge. Start it using the instructions in README.md.',
        );
      } finally {
        clearTimeout(timeout);
        if (request === connectionRequest.current) {
          bridgeRequest.current = undefined;
          setCheckingBridge(false);
        }
      }
    }
    if (request !== connectionRequest.current) return;
    const adapter = createAdapter(profile, selected, {
      fetcher: expoFetch as typeof globalThis.fetch,
      origin,
    });
    await session.connect(adapter);
  }
  async function capture() {
    if (!selected || saving) return;
    setSaving(true);
    setNotice(undefined);
    try {
      const bytes = await session.capture();
      await saveMedia(bytes, {
        savedCameraId: selected.id,
        profileId: selected.profileId,
        cameraName: selected.nickname,
      });
      setMedia(await listMedia());
      setNotice('Snapshot saved to your library.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save snapshot.');
    } finally {
      setSaving(false);
    }
  }
  async function removeMedia(item: SavedMedia) {
    await deleteMedia(item);
    setMedia(await listMedia());
  }

  return {
    state,
    cameras,
    selected,
    profile,
    media,
    ready,
    saving,
    checkingBridge,
    notice,
    setNotice,
    saveCamera,
    removeCamera,
    selectCamera,
    connect,
    disconnect,
    capture,
    removeMedia,
    exportMedia,
  };
}

type CameraModel = ReturnType<typeof useCameraModel>;
const CameraContext = createContext<CameraModel | null>(null);
export function CameraProvider({ children }: { children: React.ReactNode }) {
  const model = useCameraModel();
  return <CameraContext.Provider value={model}>{children}</CameraContext.Provider>;
}
export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) throw new Error('CameraProvider is required.');
  return context;
}
