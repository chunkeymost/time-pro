/**
 * Kriptografi untuk autentikasi Time Pro.
 *
 * - Password  : scrypt (hash satu arah, salt acak per akun)
 * - auth.json : AES-256-GCM (seluruh payload akun terenkripsi)
 * - Key file  : HKDF-SHA256 dari AUTH_ENCRYPTION_KEY
 *
 * Tidak memakai dependency eksternal — hanya `crypto` bawaan Node.js.
 */

const crypto = require('crypto');

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

const AES_ALGO = 'aes-256-gcm';
const AES_IV_BYTES = 12;
const AES_TAG_BYTES = 16;
const HKDF_INFO = 'timepro-auth-store-v1';

function scryptAsync(password, salt, params) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, params, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

function scryptParams(N = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P) {
  return { N, r, p, maxmem: SCRYPT_MAXMEM };
}

function encodePasswordHash(N, r, p, salt, hash) {
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
}

function parsePasswordHash(stored) {
  if (typeof stored !== 'string') return null;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const N = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return null;
  let salt;
  let hash;
  try {
    salt = Buffer.from(parts[4], 'base64');
    hash = Buffer.from(parts[5], 'base64');
  } catch (_) {
    return null;
  }
  if (!salt.length || !hash.length) return null;
  return { N, r, p, salt, hash };
}

/** Hash password baru. */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(String(password), salt, scryptParams());
  return encodePasswordHash(SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, hash);
}

/** Versi sinkron — hanya untuk hash "dummy" saat startup. */
function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, scryptParams());
  return encodePasswordHash(SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, hash);
}

/** Verifikasi password terhadap hash tersimpan (timing-safe). */
async function verifyPassword(password, stored) {
  const parsed = parsePasswordHash(stored);
  if (!parsed) return false;
  const derived = await scryptAsync(String(password), parsed.salt, scryptParams(parsed.N, parsed.r, parsed.p));
  if (derived.length !== parsed.hash.length) return false;
  return crypto.timingSafeEqual(derived, parsed.hash);
}

/** Bandingkan dua string secara timing-safe (lewat digest agar panjang tidak bocor). */
function safeEqualStrings(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

/** Turunkan kunci AES-256 dari string secret (hex / utf8) memakai HKDF-SHA256. */
function deriveKey(inputKeyMaterial, info = HKDF_INFO) {
  const material = Buffer.from(String(inputKeyMaterial), 'utf8');
  return Buffer.from(crypto.hkdfSync('sha256', material, Buffer.alloc(0), Buffer.from(info, 'utf8'), 32));
}

/** Enkripsi objek menjadi record siap simpan. */
function encryptRecord(payload, key) {
  const iv = crypto.randomBytes(AES_IV_BYTES);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: ciphertext.toString('base64'),
  };
}

/** Dekripsi record. Throw jika key salah / data korup. */
function decryptRecord(record, key) {
  if (!record || typeof record.iv !== 'string' || typeof record.tag !== 'string' || typeof record.data !== 'string') {
    throw new Error('Record terenkripsi tidak valid');
  }
  const iv = Buffer.from(record.iv, 'base64');
  const tag = Buffer.from(record.tag, 'base64');
  const ciphertext = Buffer.from(record.data, 'base64');
  if (iv.length !== AES_IV_BYTES || tag.length !== AES_TAG_BYTES) {
    throw new Error('Record terenkripsi tidak valid');
  }
  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

function newId(prefix = 'usr') {
  return prefix + '_' + crypto.randomBytes(10).toString('hex');
}

module.exports = {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  parsePasswordHash,
  safeEqualStrings,
  deriveKey,
  encryptRecord,
  decryptRecord,
  newId,
};
