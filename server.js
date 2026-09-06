import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(root, 'public');
const port = Number(process.env.PORT || 3000);
const secret = process.env.HMAC_SECRET || 'local-development-secret-change-me';
const sessionTtlSeconds = 60 * 60 * 8;
const secureCookie = process.env.NODE_ENV === 'production';
const users = new Map(
  (process.env.WEB_USERS || 'player:change-me').split(',').map((entry) => {
    const separator = entry.indexOf(':');
    return [entry.slice(0, separator), entry.slice(separator + 1)];
  }),
);

function sign(value) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function createSession(username) {
  const payload = Buffer.from(JSON.stringify({ username, exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function getSession(request) {
  const cookies = Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((cookie) => {
    const index = cookie.indexOf('=');
    return [cookie.slice(0, index).trim(), decodeURIComponent(cookie.slice(index + 1).trim())];
  }));
  const token = cookies.tobesuki_session;
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const validSignature = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!validSignature) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return JSON.parse(body || '{}');
}

async function serveStatic(response, pathname) {
  const filePath = pathname === '/' ? join(publicDir, 'index.html') : join(publicDir, pathname.slice(1));
  if (!filePath.startsWith(publicDir)) return sendJson(response, 404, { error: 'Not found' });
  try {
    const content = await readFile(filePath);
    const contentType = extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'POST' && url.pathname === '/api/login') {
    try {
      const { username, password } = await readBody(request);
      if (!users.has(username) || users.get(username) !== password) {
        return sendJson(response, 401, { error: 'ユーザー名またはパスワードが違います' });
      }
      return sendJson(response, 200, { ok: true }, {
        'Set-Cookie': `tobesuki_session=${encodeURIComponent(createSession(username))}; HttpOnly; SameSite=Lax;${secureCookie ? ' Secure;' : ''} Path=/; Max-Age=${sessionTtlSeconds}`,
      });
    } catch {
      return sendJson(response, 400, { error: 'リクエスト形式が不正です' });
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/logout') {
    return sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'tobesuki_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }

  if (request.method === 'GET' && url.pathname === '/api/me') {
    const session = getSession(request);
    return session ? sendJson(response, 200, { authenticated: true, username: session.username }) : sendJson(response, 401, { authenticated: false });
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === 'GET' && url.pathname === '/api/quests') {
    const session = getSession(request);
    if (!session) return sendJson(response, 401, { error: 'ログインが必要です' });
    return sendJson(response, 200, { quests: [{ id: 'welcome', title: 'TOBESUKIへようこそ', status: 'available' }] });
  }

  if (request.method === 'GET') return serveStatic(response, url.pathname);
  sendJson(response, 404, { error: 'Not found' });
});

server.listen(port, () => console.log(`TOBESUKI is running at http://localhost:${port}`));
