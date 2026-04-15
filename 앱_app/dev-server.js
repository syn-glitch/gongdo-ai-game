// 공도 AI-Game — 로컬 개발 서버
// Vercel dev 대체용 (vercel link 없이 api/*.js 를 로컬에서 그대로 실행)
// 운영 배포는 `vercel --prod` 로 동일 코드 그대로 올라감

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';

// .env.local 로드
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env.local');
  const envText = await readFile(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !line.trim().startsWith('#')) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  console.log('[dev-server] .env.local 로드 완료');
} catch (err) {
  console.warn('[dev-server] .env.local 없음 또는 읽기 실패');
}

const PORT = Number(process.env.PORT) || 3000;
const ROOT = dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.wav':  'audio/wav',
  '.mp3':  'audio/mpeg',
};

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Vercel 스타일 req.body / res.status / res.json 어댑터
function adapt(req, res) {
  const origStatus = (code) => { res.statusCode = code; return resWrap; };
  const resWrap = {
    status: origStatus,
    json: (obj) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(obj));
    },
    send: (text) => res.end(text),
    setHeader: (k, v) => res.setHeader(k, v),
    end: (data) => res.end(data),
    get statusCode() { return res.statusCode; },
    set statusCode(v) { res.statusCode = v; },
  };
  return resWrap;
}

async function getApiHandler(apiPath) {
  // 개발 편의: 매 요청마다 파일을 새로 import (코드 변경 즉시 반영)
  const mod = await import(pathToFileURL(apiPath).href + `?t=${Date.now()}`);
  return mod.default;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const decoded = decodeURIComponent(url.pathname);

    // ─── /api/* 라우팅 ───
    if (decoded.startsWith('/api/')) {
      const name = decoded.slice(5).replace(/\.js$/, '');
      if (!/^[\w-]+$/.test(name)) {
        res.statusCode = 404;
        return res.end('API not found');
      }
      const apiFile = join(ROOT, 'api', `${name}.js`);
      try {
        await stat(apiFile);
      } catch {
        res.statusCode = 404;
        return res.end('API not found');
      }
      const handler = await getApiHandler(apiFile);
      const bodyText = await readBody(req);
      req.body = bodyText;
      const resW = adapt(req, res);
      await handler(req, resW);
      return;
    }

    // ─── 정적 파일 ───
    let pathname = decoded === '/' ? '/index.html' : decoded;
    const filePath = join(ROOT, pathname);
    try {
      const st = await stat(filePath);
      if (st.isDirectory()) {
        res.writeHead(302, { Location: pathname.endsWith('/') ? pathname + 'index.html' : pathname + '/index.html' });
        return res.end();
      }
      const buf = await readFile(filePath);
      const type = MIME[extname(pathname).toLowerCase()] || 'application/octet-stream';
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'no-store');
      res.end(buf);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  } catch (err) {
    console.error('[dev-server] 오류:', err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`[dev-server] 🚀 http://localhost:${PORT}`);
  console.log(`[dev-server] API 엔드포인트: /api/chat (POST)`);
  console.log(`[dev-server] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ 로드됨' : '✗ 미설정'}`);
});
