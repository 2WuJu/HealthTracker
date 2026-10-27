import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const publicRoot = new URL('./dist/', import.meta.url);
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const publicFiles = new Set(['index.html', 'styles.css', 'app.mjs', 'domain.mjs', 'storage.mjs', 'icon.svg']);

export function createServer() {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const name = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!publicFiles.has(name)) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      const content = await readFile(new URL(name, publicRoot));
      const extension = name.slice(name.lastIndexOf('.'));
      response.writeHead(200, { 'Content-Type': mimeTypes[extension], 'Content-Length': content.length });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      response.writeHead(400);
      response.end('Invalid request');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4173);
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用。若已启动本应用，请直接打开 http://127.0.0.1:${port}` : error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`知食已启动：http://127.0.0.1:${port}`);
    console.log('请在同一浏览器、同一地址下使用，以保留本机记录。按 Ctrl+C 停止。');
  });
}
