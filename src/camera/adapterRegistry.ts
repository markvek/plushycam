import type { CameraAdapter, CameraProfile, Fetcher, SavedCamera } from './types';
import { cameraOrigin, endpointUrl, validateProfiles } from './config';
import { isJpeg, MAX_FRAME_BYTES, MjpegParser } from './mjpeg';

export type TransportOptions = { fetcher: Fetcher; origin?: string; timeoutMs?: number };

function createHttpMjpegAdapter(
  profile: CameraProfile,
  camera: SavedCamera,
  options: TransportOptions,
): CameraAdapter {
  const origin = options.origin ?? cameraOrigin(camera, profile);
  const timeoutMs = options.timeoutMs ?? 10000;
  const fetcher = options.fetcher;

  async function request<T>(
    path: string,
    parent: AbortSignal,
    consume: (response: Response, touch: () => void) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    let timer: ReturnType<typeof setTimeout>;
    let timedOut = false;
    const touch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    };
    parent.addEventListener('abort', abort, { once: true });
    if (parent.aborted) controller.abort();
    touch();
    try {
      const response = await fetcher(endpointUrl(origin, path), {
        signal: controller.signal,
        cache: 'no-store',
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(
          `Camera returned HTTP ${response.status}. Check whether another viewer is connected.`,
        );
      }
      return await consume(response, touch);
    } catch (error) {
      if (timedOut)
        throw new Error(
          `No camera frames received for ${timeoutMs / 1000} seconds. Check power, Wi-Fi, and the camera address.`,
        );
      if (error instanceof TypeError && !parent.aborted)
        throw new Error(
          'Cannot reach the camera. Check Wi-Fi, the address, and local-network permission. In a browser, the original XIAO firmware needs the local bridge described in the setup guide.',
        );
      throw error;
    } finally {
      clearTimeout(timer!);
      parent.removeEventListener('abort', abort);
      controller.abort();
    }
  }

  return {
    async stream(signal, onFrame) {
      await request(profile.endpoints.liveView.path, signal, async (response, touch) => {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Streaming is unavailable in this environment.');
        try {
          const parser = new MjpegParser(response.headers.get('content-type') ?? '');
          let renderedAt = 0;
          while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) throw new Error('Camera closed the live feed. Reconnecting…');
            for (const bytes of parser.push(value)) {
              touch();
              // Bound UI/base64 work; consume all incoming frames to prevent backpressure buildup.
              const now = Date.now();
              if (now - renderedAt >= 100) {
                renderedAt = now;
                onFrame({ bytes, receivedAt: now });
              }
            }
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      });
    },
    async snapshot(signal) {
      if (!profile.capabilities.snapshot || !profile.endpoints.snapshot)
        throw new Error('Snapshots are not supported by this camera profile.');
      return request(profile.endpoints.snapshot.path, signal, async (response) => {
        if (!/^image\/jpeg\b/i.test(response.headers.get('content-type') ?? ''))
          throw new Error('Camera snapshot was not a JPEG image.');
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Snapshot response is empty.');
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > MAX_FRAME_BYTES) throw new Error('Snapshot exceeded the supported size.');
            chunks.push(value);
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        if (!isJpeg(bytes)) throw new Error('Camera snapshot is incomplete. Please retry.');
        return bytes;
      });
    },
  };
}

export const adapterFactories = { 'http-mjpeg-v1': createHttpMjpegAdapter };

export function createAdapter(
  profile: CameraProfile,
  camera: SavedCamera,
  options: TransportOptions,
): CameraAdapter {
  validateProfiles([profile]);
  if (camera.profileId !== profile.id)
    throw new Error('Saved camera does not match the selected profile.');
  return adapterFactories[profile.adapter](profile, camera, options);
}
