import test from 'node:test';
import assert from 'node:assert/strict';
import { MjpegParser } from '../src/camera/mjpeg';

const image = Uint8Array.from([255, 216, 1, 2, 3, 255, 217]);
function part(length = true) {
  return Buffer.concat([
    Buffer.from(
      `--frame\r\nContent-Type: image/jpeg\r\n${length ? `Content-Length: ${image.length}\r\n` : ''}\r\n`,
    ),
    image,
    Buffer.from('\r\n'),
  ]);
}
test('parses multipart frames split at every byte boundary', () => {
  const input = Buffer.concat([part(), part()]);
  for (let split = 1; split < input.length; split++) {
    const parser = new MjpegParser('multipart/x-mixed-replace; boundary="frame"');
    const frames = [
      ...parser.push(input.subarray(0, split)),
      ...parser.push(input.subarray(split)),
    ];
    assert.equal(frames.length, 2);
    assert.deepEqual(frames[0], image);
  }
});
test('supports boundary-delimited frames without content lengths', () => {
  const parser = new MjpegParser('multipart/x-mixed-replace; boundary=frame');
  const frames = parser.push(Buffer.concat([part(false), Buffer.from('--frame--\r\n')]));
  assert.deepEqual(frames, [image]);
});
test('rejects bad content types, corrupt images, and oversized parts', () => {
  assert.throws(() => new MjpegParser('text/html'), /MJPEG stream/);
  assert.throws(
    () =>
      new MjpegParser('multipart/x-mixed-replace; boundary=frame').push(
        Buffer.from('--frame\r\nContent-Type: image/jpeg\r\nContent-Length: 999999999\r\n\r\n'),
      ),
    /length/,
  );
  const corrupt = Buffer.concat([
    Buffer.from('--frame\r\nContent-Type: image/jpeg\r\nContent-Length: 4\r\n\r\n'),
    Buffer.from([0, 0, 0, 0]),
  ]);
  assert.throws(
    () => new MjpegParser('multipart/x-mixed-replace; boundary=frame').push(corrupt),
    /incomplete/,
  );
});
