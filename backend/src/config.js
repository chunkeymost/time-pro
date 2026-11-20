require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function parseMysqlUrl(url) {
  if (!url) return null;
  const pattern = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(pattern);
  if (!match) return null;
  return {
    host: match[3],
    port: parseInt(match[4], 10),
    user: match[1],
    password: match[2],
    database: match[5],
  };
}

function parseDuration(value, fallbackSeconds) {
  if (value === undefined || value === null || value === '') return fallbackSeconds;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(60, value);
  const match = String(value).trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!match) return fallbackSeconds;
  const amount = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return Math.max(60, amount * multipliers[unit]);
}

/**
 * Secret auth diambil dari .env. Jika belum ada, dibuat otomatis dan disimpan
 * ke data/.auth-secrets.json (mode 0600, sudah di-gitignore) agar sesi dan
 * auth.json tetap konsisten setelah restart.
 */
function resolveAuthSecrets() {
  const secretsPath = path.join(__dirname, '..', 'data', '.auth-secrets.json');
  let saved = {};
  try {
    if (fs.existsSync(secretsPath)) saved = JSON.parse(fs.readFileSync(secretsPath, 'utf8')) || {};
  } catch (_) {
    saved = {};
  }

  let secret = process.env.AUTH_SECRET || saved.secret || '';
  let encryptionKey = process.env.AUTH_ENCRYPTION_KEY || saved.encryptionKey || '';
  let generated = false;

  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    generated = true;
  }
  if (!encryptionKey) {
    encryptionKey = crypto.randomBytes(32).toString('hex');
    generated = true;
  }

  if (generated && !process.env.AUTH_SECRET && !process.env.AUTH_ENCRYPTION_KEY) {
    try {
      fs.mkdirSync(path.dirname(secretsPath), { recursive: true });
      fs.writeFileSync(secretsPath, JSON.stringify({ secret, encryptionKey }, null, 2), { mode: 0o600 });
      try {
        fs.chmodSync(secretsPath, 0o600);
      } catch (_) {
        /* noop */
      }
      console.warn(
        '[auth] AUTH_SECRET / AUTH_ENCRYPTION_KEY belum diset di .env. ' +
          'Secret dibuat otomatis di ' + secretsPath + '. Untuk produksi, pindahkan ke .env.'
      );
    } catch (err) {
      console.warn('[auth] Gagal menyimpan secret auth otomatis:', err.message);
    }
  }

  return { secret, encryptionKey };
}

const authSecrets = resolveAuthSecrets();

const mysqlUrlConfig = parseMysqlUrl(process.env.MYSQL_URL);

const mysqlDefaults = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'db_timepro',
};

const dataDir = path.join(__dirname, '..', 'data');
const allowedOrigins = String(process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  dataPath: process.env.DATA_PATH || path.join(dataDir, 'tasks.json'),
  mysql: mysqlUrlConfig || {
    host: process.env.MYSQL_HOST || mysqlDefaults.host,
    port: parseInt(process.env.MYSQL_PORT, 10) || mysqlDefaults.port,
    user: process.env.MYSQL_USER || mysqlDefaults.user,
    password: process.env.MYSQL_PASSWORD || mysqlDefaults.password,
    database: process.env.MYSQL_DATABASE || mysqlDefaults.database,
  },
  auth: {
    filePath: process.env.AUTH_JSON_PATH || path.join(dataDir, 'auth.json'),
    secret: authSecrets.secret,
    encryptionKey: authSecrets.encryptionKey,
    cookieName: process.env.AUTH_COOKIE_NAME || 'tp_session',
    tokenTtlSeconds: parseDuration(process.env.AUTH_TOKEN_TTL, 8 * 60 * 60),
    rememberTtlSeconds: parseDuration(process.env.AUTH_REMEMBER_TTL, 30 * 24 * 60 * 60),
    cookieSecure:
      String(process.env.AUTH_COOKIE_SECURE || '').toLowerCase() === 'true' ||
      process.env.NODE_ENV === 'production',
    allowedOrigins,
    login: {
      maxAttempts: parseInt(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 10) || 5,
      windowMs: parseDuration(process.env.AUTH_LOGIN_WINDOW, 15 * 60) * 1000,
      blockMs: parseDuration(process.env.AUTH_LOGIN_BLOCK, 15 * 60) * 1000,
    },
  },
};
