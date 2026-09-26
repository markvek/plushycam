import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraProfiles } from '../cameras.config';
import {
  bridgeOrigin,
  cameraOrigin,
  endpointUrl,
  normalizeHost,
  validateProfiles,
} from '../src/camera/config';
import type { CameraProfile } from '../src/camera/types';

test('camera catalog is valid and permits another compatible model with different paths', () => {
  const second: CameraProfile = structuredClone(cameraProfiles[0]);
  second.id = 'other-brand-mjpeg';
  second.brand = 'Another brand';
  second.model = 'Test camera';
  second.endpoints = {
    liveView: { path: '/alternate/live', format: 'mjpeg' },
    snapshot: { path: '/alternate/photo', format: 'jpeg' },
  };
  validateProfiles([...cameraProfiles, second]);
  assert.equal(
    cameraOrigin(
      { id: 'one', profileId: second.id, nickname: 'Desk', host: '192.168.1.42', port: 8080 },
      second,
    ),
    'http://192.168.1.42:8080',
  );
});
test('reject duplicate IDs, missing adapter support, false capability promises, and endpoint origin changes', () => {
  assert.throws(() => validateProfiles([cameraProfiles[0], cameraProfiles[0]]), /unique/);
  const p = structuredClone(cameraProfiles[0]) as CameraProfile;
  p.capabilities.recordingControl = true;
  assert.throws(() => validateProfiles([p]), /recordingControl/);
  p.capabilities.recordingControl = false;
  p.endpoints.snapshot = undefined;
  assert.throws(() => validateProfiles([p]), /JPEG endpoint/);
  for (const path of [
    '//elsewhere/stream',
    '/\\elsewhere/stream',
    'https://elsewhere/stream',
    '/stream#ignored',
  ]) {
    assert.throws(() => endpointUrl('http://192.168.1.42', path));
  }
  p.adapter = 'unknown' as CameraProfile['adapter'];
  assert.throws(() => validateProfiles([p]), /not installed/);
});
test('device addresses are kept separate from credentials, paths, and ports', () => {
  assert.equal(normalizeHost(' camera.local '), 'camera.local');
  assert.equal(normalizeHost('[::1]'), '[::1]');
  for (const host of [
    'http://camera',
    'camera/path',
    'user:password@camera',
    'camera:8080',
    '999.1.1.1',
    '',
  ])
    assert.throws(() => normalizeHost(host));
  assert.equal(bridgeOrigin('http://localhost:8787'), 'http://localhost:8787');
  assert.throws(() => bridgeOrigin('http://localhost:8787/proxy?target=elsewhere'));
});
