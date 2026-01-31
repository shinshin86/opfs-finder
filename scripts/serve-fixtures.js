import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../tests/fixtures', import.meta.url));
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function getContentType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const requestPath = decodeURIComponent(url.pathname);
    const normalized = normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = join(ROOT, normalized);

    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    if (fileStat.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }

    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  } catch (error) {
    res.writeHead(500);
    res.end(error instanceof Error ? error.message : 'Internal Server Error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving fixtures on http://127.0.0.1:${PORT}`);
});
