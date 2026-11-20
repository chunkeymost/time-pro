/**
 * Manajemen sesi: signed token (HMAC-SHA256) + cookie HttpOnly.
 *
 * Token format: base64url(payload).base64url(hmacSha256(payload))
 * Payload: { sub, un, role, ver, iat, exp }
 */

const crypto = require('crypto');

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function hmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

function signToken(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + Math.max(60, ttlSeconds),
  };
  const data = toBase64Url(JSON.stringify(body));
  const signature = toBase64Url(hmac(data, secret));
  return data + '.' + signature;
}

function verifyToken(token, secret) {
  if (typeof token !== 'string') return null;
  const separator = token.indexOf('.');
  if (separator <= 0) return null;
  const data = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!data || !signature) return null;

  let provided;
  let expected;
  try {
    provided = fromBase64Url(signature);
    expected = hmac(data, secret);
  } catch (_) {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(data).toString('utf8'));
  } catch (_) {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  if (!payload.sub || !payload.exp) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;
  return payload;
}

function parseCookies(req) {
  const header = req && req.headers ? req.headers.cookie : '';
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index < 0) return;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) return;
    try {
      out[name] = decodeURIComponent(value);
    } catch (_) {
      out[name] = value;
    }
  });
  return out;
}

function serializeCookie(name, value, options = {}) {
  const parts = [name + '=' + encodeURIComponent(value)];
  parts.push('Path=' + (options.path || '/'));
  parts.push('HttpOnly');
  parts.push('SameSite=' + (options.sameSite || 'Strict'));
  if (options.maxAge !== undefined && options.maxAge !== null) {
    parts.push('Max-Age=' + Math.max(0, Math.floor(options.maxAge)));
  }
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

function setSessionCookie(res, token, options = {}) {
  const cookie = serializeCookie(options.name || 'tp_session', token, {
    path: '/',
    sameSite: options.sameSite || 'Strict',
    secure: !!options.secure,
    maxAge: options.maxAge,
  });
  const existing = res.getHeader('Set-Cookie');
  if (existing) {
    res.setHeader('Set-Cookie', [].concat(existing, cookie));
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

function clearSessionCookie(res, options = {}) {
  setSessionCookie(res, '', {
    name: options.name || 'tp_session',
    secure: !!options.secure,
    sameSite: options.sameSite || 'Strict',
    maxAge: 0,
  });
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (req.path === '/api' || req.path.indexOf('/api/') === 0) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

const PUBLIC_PAGE_PATHS = new Set([
  '/login',
  '/login.html',
  '/css/styles.css',
  '/css/login.css',
  '/js/login.js',
  '/favicon.ico',
]);
const PUBLIC_PAGE_PREFIXES = ['/assets/'];

function isPublicPagePath(pathname) {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  return PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.indexOf(prefix) === 0);
}

function createAuthGuards(options) {
  const authStore = options.authStore;
  const authConfig = options.authConfig;

  async function resolveUser(req) {
    const cookies = parseCookies(req);
    const token = cookies[authConfig.cookieName];
    if (!token) return null;
    const payload = verifyToken(token, authConfig.secret);
    if (!payload || !payload.sub) return null;
    const user = await authStore.getSessionUser(payload.sub);
    if (!user) return null;
    if (typeof payload.ver === 'number' && payload.ver !== (user.tokenVersion || 1)) return null;
    return user;
  }

  async function requireAuth(req, res, next) {
    try {
      const user = await resolveUser(req);
      if (!user) {
        return res.status(401).json({
          error: 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.',
          code: 'UNAUTHENTICATED',
        });
      }
      req.user = user;
      return next();
    } catch (err) {
      return next(err);
    }
  }

  function pageGuard(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const pathname = req.path;
    if (pathname.indexOf('/api/') === 0 || pathname === '/api') return next();
    if (pathname.indexOf('/uploads/') === 0) return next();
    if (isPublicPagePath(pathname)) return next();

    const lastSegment = pathname.split('/').pop() || '';
    const isHtmlPage = pathname === '/' || lastSegment.indexOf('.') === -1 || /\.html$/i.test(lastSegment);
    if (isHtmlPage) res.setHeader('Cache-Control', 'no-store');

    resolveUser(req)
      .then((user) => {
        if (user) return next();
        res.setHeader('Cache-Control', 'no-store');
        return res.redirect(302, '/login.html');
      })
      .catch(() => {
        res.setHeader('Cache-Control', 'no-store');
        res.redirect(302, '/login.html');
      });
  }

  function requireSameOrigin(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    const origin = req.headers.origin;
    if (!origin) return next();

    let originHost = null;
    try {
      originHost = new URL(origin).host;
    } catch (_) {
      originHost = null;
    }
    if (originHost && req.headers.host && originHost === req.headers.host) return next();
    if (Array.isArray(authConfig.allowedOrigins) && authConfig.allowedOrigins.indexOf(origin) !== -1) {
      return next();
    }
    return res.status(403).json({
      error: 'Origin tidak diizinkan untuk permintaan ini.',
      code: 'FORBIDDEN_ORIGIN',
    });
  }

  return { resolveUser, requireAuth, pageGuard, requireSameOrigin };
}

module.exports = {
  signToken,
  verifyToken,
  parseCookies,
  serializeCookie,
  setSessionCookie,
  clearSessionCookie,
  securityHeaders,
  createAuthGuards,
  PUBLIC_PAGE_PATHS,
};
