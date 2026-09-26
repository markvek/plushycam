import type { CameraProfile, SavedCamera } from './types';

export const implementedAdapters = ['http-mjpeg-v1'] as const;

export function validateProfiles(profiles: readonly CameraProfile[]): void {
  const ids = new Set<string>();
  for (const p of profiles) {
    const fail = (reason: string): never => {
      throw new Error(`Camera profile “${p.id}”: ${reason}`);
    };
    if (!/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id)) fail('use a unique lowercase profile ID.');
    ids.add(p.id);
    if (!p.brand.trim() || !p.model.trim()) fail('brand and model are required.');
    if (!implementedAdapters.includes(p.adapter)) fail('adapter is not installed.');
    if (!['http', 'https'].includes(p.connection.scheme)) fail('scheme must be http or https.');
    if (p.connection.authentication !== 'none')
      fail('authentication is not implemented by this adapter.');
    if (!validPort(p.connection.defaultPort)) fail('port must be an integer from 1 to 65535.');
    if (!p.capabilities.liveView || p.endpoints.liveView.format !== 'mjpeg')
      fail('this adapter requires MJPEG live view.');
    if (p.capabilities.snapshot && p.endpoints.snapshot?.format !== 'jpeg')
      fail('snapshots require a JPEG endpoint.');
    for (const [capability, enabled] of Object.entries(p.capabilities)) {
      if (enabled && !['liveView', 'snapshot'].includes(capability))
        fail(`${capability} is not implemented by this adapter.`);
    }
    for (const endpoint of Object.values(p.endpoints)) {
      if (endpoint) {
        try {
          validateEndpoint(endpoint.path);
        } catch {
          fail('endpoints must be relative paths on the camera origin.');
        }
      }
    }
    if (
      p.constraints.maxConcurrentRequests !== 1 ||
      p.constraints.snapshotDuringLiveView !== 'pause-stream' ||
      p.constraints.heartbeatDuringLiveView !== 'use-frame-arrival'
    ) {
      fail(
        'this adapter currently supports one request, pausing streams for snapshots, and frame-based heartbeat.',
      );
    }
  }
}

export function validPort(port: number) {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

export function validateEndpoint(path: string): void {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[\\\s#]/.test(path) ||
    new URL(path, 'http://camera.invalid').origin !== 'http://camera.invalid'
  ) {
    throw new Error('Use a relative endpoint path, for example /stream.');
  }
}

export function normalizeHost(input: string): string {
  const host = input.trim();
  if (!host || /[\s/@?#\\]/.test(host) || host.includes('://'))
    throw new Error('Enter an IP address or hostname only, without http:// or a path.');
  const bracketedIPv6 = /^\[[0-9a-f:]+\]$/i.test(host);
  if (!bracketedIPv6 && !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host))
    throw new Error(
      'Enter a valid IP address or hostname. Put the port in the separate port field.',
    );
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    throw new Error('Enter a valid IP address or hostname.');
  }
}

export function cameraOrigin(camera: SavedCamera, profile: CameraProfile): string {
  const host = normalizeHost(camera.host);
  const port = camera.port ?? profile.connection.defaultPort;
  if (!validPort(port)) throw new Error('Port must be between 1 and 65535.');
  return new URL(`${profile.connection.scheme}://${host}:${port}`).origin;
}

export function bridgeOrigin(value: string): string {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Bridge address must be an HTTP origin, for example http://127.0.0.1:8787.');
  }
  return url.origin;
}

export function endpointUrl(origin: string, path: string): string {
  validateEndpoint(path);
  return new URL(path, origin).href;
}
