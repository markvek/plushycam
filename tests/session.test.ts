import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraSession } from '../src/camera/CameraSession';
import type { CameraAdapter, Frame } from '../src/camera/types';

const frame: Frame = { bytes: new Uint8Array([255, 216, 255, 217]), receivedAt: Date.now() };
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function mock(failCapture = false) {
  let active = 0;
  let maxActive = 0;
  let captures = 0;
  let starts = 0;
  let lateFrame: ((frame: Frame) => void) | undefined;
  const adapter: CameraAdapter = {
    async stream(signal, onFrame) {
      active++;
      starts++;
      maxActive = Math.max(maxActive, active);
      lateFrame = onFrame;
      onFrame(frame);
      await new Promise<void>((resolve) => {
        if (signal.aborted) resolve();
        else signal.addEventListener('abort', () => resolve(), { once: true });
      });
      active--;
    },
    async snapshot(signal) {
      assert.equal(active, 0, 'snapshot must not overlap the stream');
      assert.equal(signal.aborted, false);
      captures++;
      if (failCapture) throw new Error('Capture failed');
      return frame.bytes;
    },
  };
  return {
    adapter,
    metrics: () => ({ active, maxActive, captures, starts }),
    sendLate: () => lateFrame?.(frame),
  };
}
test('snapshot releases stream, resumes on success, and prevents simultaneous captures', async () => {
  const m = mock();
  const session = new CameraSession(5);
  await session.connect(m.adapter);
  const capture = session.capture();
  await assert.rejects(session.capture(), /already/);
  assert.deepEqual(await capture, frame.bytes);
  await delay(5);
  assert.equal(session.getSnapshot().live, 'playing');
  assert.equal(m.metrics().starts, 2);
  assert.equal(m.metrics().maxActive, 1);
  await session.disconnect();
  assert.equal(m.metrics().active, 0);
});
test('a failed snapshot still restores live view', async () => {
  const m = mock(true);
  const session = new CameraSession(5);
  await session.connect(m.adapter);
  await assert.rejects(session.capture(), /Capture failed/);
  await delay(5);
  assert.equal(session.getSnapshot().live, 'playing');
  await session.disconnect();
});
test('disconnect cancels a pending connect and ignores stale frames', async () => {
  const m = mock();
  const session = new CameraSession(5);
  const connection = session.connect(m.adapter);
  await session.disconnect();
  await connection;
  assert.equal(session.getSnapshot().connection, 'disconnected');
  assert.equal(m.metrics().starts, 0);
  await session.connect(m.adapter);
  await session.disconnect();
  m.sendLate();
  assert.equal(session.getSnapshot().frame, undefined);
});
test('latest camera owns the session when connections race', async () => {
  const first = mock();
  const second = mock();
  const session = new CameraSession(5);
  await Promise.all([session.connect(first.adapter), session.connect(second.adapter)]);
  assert.equal(first.metrics().starts, 0);
  assert.equal(second.metrics().starts, 1);
  first.sendLate();
  await session.disconnect();
});
test('disconnect during snapshot setup cancels it without restarting live view', async () => {
  const m = mock();
  const session = new CameraSession(5);
  await session.connect(m.adapter);
  const capture = session.capture();
  const rejection = assert.rejects(capture, /cancelled/);
  await session.disconnect();
  await rejection;
  assert.equal(m.metrics().captures, 0);
  assert.equal(session.getSnapshot().connection, 'disconnected');
});
test('reconnect retries stop after manual disconnect', async () => {
  let attempts = 0;
  const session = new CameraSession(5);
  const adapter: CameraAdapter = {
    async stream() {
      attempts++;
      throw new Error('Offline');
    },
    async snapshot() {
      return frame.bytes;
    },
  };
  await session.connect(adapter);
  await delay(35);
  assert.ok(attempts > 1);
  await session.disconnect();
  const previous = attempts;
  await delay(35);
  assert.equal(attempts, previous);
});
