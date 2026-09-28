import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { jpegAspectRatio, MjpegParser } from '../src/camera/mjpeg';

test('reads landscape and portrait aspect ratios from encoded camera frames', () => {
  for (const [width, height] of [[24, 16], [12, 20]]) {
    const { data } = jpeg.encode({ width, height, data: Buffer.alloc(width * height * 4) }, 65);
    assert.equal(jpegAspectRatio(data), width / height);
    assert.equal(jpegAspectRatio(data.subarray(0, 20)), undefined);
  }
});

test('invalid JPEG metadata safely falls back without reading pixel data', () => {
  for (const bytes of [
    [],
    [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9],
    [0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0, 0, 0, 0, 0, 0xff, 0xd9],
    [0xff, 0xd8, 0xff, 0xda, 0, 2, 0xff, 0xc0, 0xff, 0xd9],
  ]) {
    assert.equal(jpegAspectRatio(Uint8Array.from(bytes)), undefined);
  }
});

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
