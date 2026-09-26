import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { cameraProfiles } from '../cameras.config';
import { bridgeOrigin, endpointUrl } from '../src/camera/config';

/** Fixed-target local development bridge, not an arbitrary URL proxy. */
export function createBridge(
  target: string,
  paths: string[],
  appOrigins = ['http://localhost:8081', 'http://127.0.0.1:8081'],
) {
  const origin = bridgeOrigin(target);
  return createServer(async (req, res) => {
    const browserOrigin = req.headers.origin;
    if (browserOrigin && !appOrigins.includes(browserOrigin)) {
      res.writeHead(403);
      res.end('Origin not allowed');
      return;
    }
    if (browserOrigin) res.setHeader('Access-Control-Allow-Origin', browserOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end();
      return;
    }
    if (req.url === '/__bridge') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ cameraOrigin: origin }));
      return;
    }
    if (!paths.includes(req.url ?? '')) {
      res.writeHead(404);
      res.end('Endpoint is not configured for this camera profile.');
      return;
    }
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const upstream = await fetch(endpointUrl(origin, req.url!), {
        signal: controller.signal,
        redirect: 'error',
      });
      clearTimeout(timeout);
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      });
      if (!upstream.body) {
        res.end();
        return;
      }
      await pipeline(
        Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]),
        res,
        { signal: controller.signal },
      );
    } catch {
      if (!res.headersSent) {
        res.writeHead(502);
        res.end('Camera is unreachable. Verify its address and Wi-Fi.');
      } else res.destroy();
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  });
}

if (process.argv[1]?.endsWith('camera-bridge.ts')) {
  const args = process.argv.slice(2);
  const option = (key: string) => {
    const i = args.indexOf(key);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const target = option('--camera');
  if (!target)
    throw new Error(
      'Usage: npm run bridge -- --camera http://CAMERA_IP [--profile PROFILE_ID] [--port 8787]',
    );
  const profileId = option('--profile') ?? cameraProfiles[0].id;
  const profile = cameraProfiles.find((p) => p.id === profileId);
  if (!profile) throw new Error(`Unknown profile: ${profileId}`);
  const port = Number(option('--port') ?? 8787);
  const extraOrigin = option('--app-origin');
  const origins = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    ...(extraOrigin ? [bridgeOrigin(extraOrigin)] : []),
  ];
  const paths = Object.values(profile.endpoints).map((endpoint) => endpoint.path);
  createBridge(target, paths, origins).listen(port, '127.0.0.1', () =>
    console.log(
      `Local camera bridge: http://127.0.0.1:${port} → ${bridgeOrigin(target)} (${profile.model})`,
    ),
  );
}
