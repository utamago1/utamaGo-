import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const STAGE_DIR = path.resolve('.playwright-cli/stage');
const OUT_MP4 = path.resolve(process.argv[2] || '.playwright-cli/part.mp4');
const PORT = Number(process.argv[3] || 8766);
fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

const ff = spawn('ffmpeg', [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'mjpeg',
  '-framerate', '30',
  '-i', 'pipe:0',
  '-vf', 'scale=1080:1920:flags=lanczos',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'fast',
  '-crf', '18',
  '-r', '30',
  OUT_MP4,
], { stdio: ['pipe', 'ignore', 'pipe'] });

let ffErr = '';
ff.stderr.on('data', (d) => { ffErr += d.toString(); });
const ffExitPromise = new Promise((resolve) => {
  ff.on('close', (code) => resolve(code));
});

let frameCount = 0;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/frame') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ok = ff.stdin.write(buf);
      frameCount++;
      const finish = () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ n: frameCount }));
      };
      if (ok) finish();
      else ff.stdin.once('drain', finish);
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/done') {
    ff.stdin.end();
    ffExitPromise.then((code) => {
      res.writeHead(code === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: code === 0,
        code,
        frames: frameCount,
        sizeBytes: fs.existsSync(OUT_MP4) ? fs.statSync(OUT_MP4).size : 0,
        errTail: code === 0 ? '' : ffErr.slice(-500),
      }));
      setTimeout(() => process.exit(code === 0 ? 0 : 1), 150);
    });
    return;
  }

  const reqPath = (req.url || '/').split('?')[0];
  const filePath = path.join(STAGE_DIR, reqPath === '/' ? 'stage.html' : reqPath);
  if (!filePath.startsWith(STAGE_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`RENDER_SERVER_READY:${PORT}`);
});
