import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(scriptDir, '..', 'dist');
const port = Number.parseInt(process.env.PORT ?? '8000', 10);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

function resolveRequestPath(requestUrl) {
    const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = resolve(distDir, relativePath);

    if (filePath !== distDir && !filePath.startsWith(`${distDir}${sep}`)) {
        return null;
    }

    return filePath;
}

const server = createServer(async (request, response) => {
    const filePath = resolveRequestPath(request.url ?? '/');

    if (!filePath) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
    }

    try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
            throw new Error('Not a file');
        }

        response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
        });
        createReadStream(filePath).pipe(response);
    } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not Found');
    }
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Set PORT to use another port.`);
    } else {
        console.error(error);
    }
    process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Local server: http://localhost:${port}`);
});
