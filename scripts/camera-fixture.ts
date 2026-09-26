import { createServer, type ServerResponse } from 'node:http';
import jpeg from 'jpeg-js';

export function createFixture() {
  const clients = new Set<ServerResponse>();
  const stats = { streams: 0, captures: 0, active: 0, maxActive: 0 };
  let stalled = false;
  let failSnapshot = false;
  let tick = 0;
  function frame() {
    const width = 480,
      height = 300;
    const data = Buffer.alloc(width * height * 4);
    const bar = (tick++ * 13) % width;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const grid = x % 60 < 2 || y % 60 < 2;
        const moving = Math.abs(x - bar) < 12;
        data[i] = moving ? 186 : grid ? 65 : 15 + x / 10;
        data[i + 1] = moving ? 247 : grid ? 110 : 35 + y / 4;
        data[i + 2] = moving ? 212 : grid ? 100 : 45 + x / 9;
        data[i + 3] = 255;
      }
    return jpeg.encode({ data, width, height }, 65).data;
  }
  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url ?? '/', 'http://fixture');
    if (url.pathname === '/__stats') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(stats));
      return;
    }
    if (url.pathname === '/__control' && req.method === 'POST') {
      stalled = url.searchParams.get('stall') === '1';
      failSnapshot = url.searchParams.get('snapshotFail') === '1';
      if (url.searchParams.get('drop') === '1') for (const client of clients) client.destroy();
      res.end('ok');
      return;
    }
    if (['/capture', '/alternate/photo'].includes(url.pathname)) {
      stats.captures++;
      if (clients.size || failSnapshot) {
        res.writeHead(503);
        res.end('Camera busy');
        return;
      }
      const bytes = frame();
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': bytes.length });
      res.end(bytes);
      return;
    }
    if (['/stream', '/alternate/live'].includes(url.pathname)) {
      if (clients.size) {
        res.writeHead(503);
        res.end('Camera already streaming');
        return;
      }
      clients.add(res);
      stats.streams++;
      stats.active++;
      stats.maxActive = Math.max(stats.maxActive, stats.active);
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        Connection: 'close',
      });
      res.flushHeaders();
      const send = () => {
        if (stalled || res.writableLength > 1024 * 1024) return;
        const bytes = frame();
        res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${bytes.length}\r\n\r\n`);
        res.write(bytes);
        res.write('\r\n');
      };
      send();
      const interval = setInterval(send, 200);
      res.on('close', () => {
        clearInterval(interval);
        if (clients.delete(res)) stats.active--;
      });
      return;
    }
    res.writeHead(404);
    res.end('Fixture camera: /stream and /capture');
  });
  return {
    server,
    stats,
    closeStreams: () => {
      for (const client of clients) client.destroy();
    },
  };
}

if (process.argv[1]?.endsWith('camera-fixture.ts')) {
  const fixture = createFixture();
  const index = process.argv.indexOf('--port');
  const port = index > -1 ? Number(process.argv[index + 1]) : 8790;
  const hostIndex = process.argv.indexOf('--host');
  const host = hostIndex > -1 ? process.argv[hostIndex + 1] : '127.0.0.1';
  fixture.server.listen(port, host, () =>
    console.log(
      `Simulated camera at http://${host}:${port}. Select the XIAO profile, use this host/port, and name it “Fixture camera”. No physical camera is being accessed.`,
    ),
  );
}
