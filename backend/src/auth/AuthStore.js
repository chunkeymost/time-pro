/**
 * Penyimpanan akun terenkripsi di backend/data/auth.json.
 *
 * Struktur file:
 * {
 *   "version": 1,
 *   "updatedAt": "...",
 *   "records": [ { iv, tag, data } ]   // data = AES-256-GCM(JSON akun)
 * }
 *
 * Payload akun (di dalam enkripsi):
 * { id, username, usernameLower, passwordHash, role, tokenVersion, createdAt, updatedAt }
 *
 * Tidak ada username maupun password plaintext di file.
 */

const fs = require('fs');
const path = require('path');
const {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  safeEqualStrings,
  deriveKey,
  encryptRecord,
  decryptRecord,
  newId,
} = require('./crypto');

const FILE_VERSION = 1;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const ROLES = ['superadmin', 'admin', 'user'];

class AuthStore {
  constructor(options) {
    const filePath = options && options.filePath;
    const encryptionKey = options && options.encryptionKey;
    if (!filePath) throw new Error('AuthStore: filePath wajib diisi');
    if (!encryptionKey) throw new Error('AuthStore: encryptionKey wajib diisi');

    this.filePath = filePath;
    this.key = deriveKey(encryptionKey);
    this.users = [];
    this.loaded = false;
    this.writeChain = Promise.resolve();
    this.dummyHash = hashPasswordSync(require('crypto').randomBytes(18).toString('hex'));
  }

  async init() {
    if (this.loaded) return this;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.users = [];
      this.loaded = true;
      return this;
    }

    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (err) {
      throw new Error('auth.json tidak dapat dibaca: ' + err.message);
    }
    if (!raw || !Array.isArray(raw.records)) {
      throw new Error('Format auth.json tidak valid (records tidak ditemukan)');
    }

    const users = [];
    for (const record of raw.records) {
      let payload;
      try {
        payload = decryptRecord(record, this.key);
      } catch (err) {
        throw new Error(
          'auth.json tidak dapat didekripsi. Pastikan AUTH_ENCRYPTION_KEY sama dengan saat akun dibuat.'
        );
      }
      if (!payload || !payload.usernameLower) continue;
      users.push(payload);
    }
    this.users = users;
    this.loaded = true;
    return this;
  }

  async _ensureLoaded() {
    if (!this.loaded) await this.init();
  }

  _withWriteLock(fn) {
    const run = this.writeChain.then(fn, fn);
    this.writeChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  _findByUsername(username) {
    const needle = String(username || '').trim().toLowerCase();
    let found = null;
    for (const user of this.users) {
      const isMatch = safeEqualStrings(user.usernameLower, needle);
      if (isMatch && !found) found = user;
    }
    return found;
  }

  _findById(id) {
    if (!id) return null;
    for (const user of this.users) {
      if (safeEqualStrings(user.id, id)) return user;
    }
    return null;
  }

  static toPublicUser(user) {
    if (!user) return null;
    return { username: user.username, role: user.role };
  }

  /** Buat akun baru. Throw error dengan pesan yang aman ditampilkan ke admin/CLI. */
  async createUser(input) {
    await this._ensureLoaded();
    const username = String((input && input.username) || '').trim();
    const password = String((input && input.password) || '');
    const role = ROLES.includes(input && input.role) ? input.role : 'user';

    if (!USERNAME_PATTERN.test(username)) {
      throw new Error('Username 3-32 karakter, hanya huruf, angka, titik, garis bawah, atau strip.');
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      throw new Error('Password minimal ' + MIN_PASSWORD_LENGTH + ' karakter.');
    }

    const usernameLower = username.toLowerCase();

    return this._withWriteLock(async () => {
      if (this._findByUsername(usernameLower)) {
        throw new Error('Username sudah terdaftar.');
      }
      const now = new Date().toISOString();
      const user = {
        id: newId('usr'),
        username,
        usernameLower,
        passwordHash: await hashPassword(password),
        role,
        tokenVersion: 1,
        createdAt: now,
        updatedAt: now,
      };
      this.users.push(user);
      try {
        this._writeFile();
      } catch (err) {
        this.users.pop();
        throw new Error('Gagal menyimpan auth.json: ' + err.message);
      }
      return { id: user.id, username: user.username, role: user.role };
    });
  }

  /**
   * Verifikasi kredensial login.
   * Selalu melakukan scrypt (termasuk saat user tidak ada) agar timing seragam.
   * @returns {Promise<{username:string, role:string, id:string, tokenVersion:number}|null>}
   */
  async verifyCredentials(username, password) {
    await this._ensureLoaded();
    const user = this._findByUsername(username);
    if (!user) {
      await verifyPassword(password, this.dummyHash);
      return null;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion || 1,
    };
  }

  /** Dipakai untuk memvalidasi sesi (token → user). */
  async getSessionUser(id) {
    await this._ensureLoaded();
    const user = this._findById(id);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion || 1,
    };
  }

  async getUserById(id) {
    return this.getSessionUser(id);
  }

  async count() {
    await this._ensureLoaded();
    return this.users.length;
  }

  /** Placeholder untuk fase ganti password (belum diekspos lewat API). */
  async updatePassword(userId, newPassword) {
    await this._ensureLoaded();
    const password = String(newPassword || '');
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      throw new Error('Password minimal ' + MIN_PASSWORD_LENGTH + ' karakter.');
    }
    return this._withWriteLock(async () => {
      const user = this._findById(userId);
      if (!user) throw new Error('Akun tidak ditemukan.');
      user.passwordHash = await hashPassword(password);
      user.tokenVersion = (user.tokenVersion || 1) + 1;
      user.updatedAt = new Date().toISOString();
      this._writeFile();
      return { id: user.id, username: user.username, role: user.role };
    });
  }

  _writeFile() {
    const records = this.users.map((user) =>
      encryptRecord(
        {
          id: user.id,
          username: user.username,
          usernameLower: user.usernameLower,
          passwordHash: user.passwordHash,
          role: user.role,
          tokenVersion: user.tokenVersion || 1,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        this.key
      )
    );

    const payload = {
      version: FILE_VERSION,
      updatedAt: new Date().toISOString(),
      records,
    };

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 });
    try {
      fs.chmodSync(tmp, 0o600);
    } catch (_) {
      /* noop (Windows) */
    }
    fs.renameSync(tmp, this.filePath);
    try {
      fs.chmodSync(this.filePath, 0o600);
    } catch (_) {
      /* noop */
    }
  }
}

module.exports = { AuthStore, ROLES, MIN_PASSWORD_LENGTH };
