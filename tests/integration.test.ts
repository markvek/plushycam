import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { cameraProfiles } from '../cameras.config';
import { createFixture } from '../scripts/camera-fixture';
import { createBridge } from '../scripts/camera-bridge';
import { createAdapter } from '../src/camera/adapterRegistry';
import { CameraSession } from '../src/camera/CameraSession';
import { isJpeg } from '../src/camera/mjpeg';
import type { CameraProfile } from '../src/camera/types';

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
async function until(predicate: () => boolean) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 4000) throw new Error('Condition timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test('real HTTP stream → capture → resume works with alternate configured endpoints', async () => {
  const fixture = createFixture();
  const port = await listen(fixture.server);
  const session = new CameraSession(20);
  const profile: CameraProfile = structuredClone(cameraProfiles[0]);
  profile.id = 'alternative-camera';
  profile.endpoints = {
    liveView: { path: '/alternate/live', format: 'mjpeg' },
    snapshot: { path: '/alternate/photo', format: 'jpeg' },
  };
  const adapter = createAdapter(
    profile,
    { id: 'fixture', nickname: 'Fixture', profileId: profile.id, host: '127.0.0.1', port },
    { fetcher: fetch },
  );
  try {
    await session.connect(adapter);
    await until(() => session.getSnapshot().live === 'playing');
    const image = await session.capture();
    assert.ok(isJpeg(image));
    await until(() => session.getSnapshot().live === 'playing');
    assert.equal(fixture.stats.captures, 1);
    assert.equal(fixture.stats.maxActive, 1);
    fixture.closeStreams();
    await until(() => fixture.stats.streams >= 3);
  } finally {
    await session.disconnect();
    fixture.closeStreams();
    await close(fixture.server);
  }
});

test('bridge verifies target, restricts endpoints/origins, and releases upstream on client abort', async () => {
  const fixture = createFixture();
  const port = await listen(fixture.server);
  const bridge = createBridge(`http://127.0.0.1:${port}`, ['/stream', '/capture']);
  const bridgePort = await listen(bridge);
  const base = `http://127.0.0.1:${bridgePort}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/__bridge`)).json(), {
      cameraOrigin: `http://127.0.0.1:${port}`,
    });
    assert.equal((await fetch(`${base}/unconfigured`)).status, 404);
    assert.equal(
      (await fetch(`${base}/capture`, { headers: { Origin: 'https://unrelated.example' } })).status,
      403,
    );
    const response = await fetch(`${base}/capture`, {
      headers: { Origin: 'http://localhost:8081' },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    assert.ok(isJpeg(new Uint8Array(await response.arrayBuffer())));
    const controller = new AbortController();
    const stream = await fetch(`${base}/stream`, { signal: controller.signal });
    const reader = stream.body!.getReader();
    await reader.read();
    controller.abort();
    await reader.cancel().catch(() => {});
    await until(() => fixture.stats.active === 0);
  } finally {
    fixture.closeStreams();
    await close(bridge);
    await close(fixture.server);
  }
});

test('stalled stream watchdog aborts instead of waiting forever', async () => {
  const fixture = createFixture();
  const port = await listen(fixture.server);
  await fetch(`http://127.0.0.1:${port}/__control?stall=1`, { method: 'POST' });
  const profile = cameraProfiles[0];
  const adapter = createAdapter(
    profile,
    { id: 'fixture', nickname: 'Fixture', profileId: profile.id, host: '127.0.0.1', port },
    { fetcher: fetch, timeoutMs: 50 },
  );
  try {
    await assert.rejects(
      adapter.stream(new AbortController().signal, () => {}),
      /No camera frames/,
    );
  } finally {
    fixture.closeStreams();
    await close(fixture.server);
  }
});
