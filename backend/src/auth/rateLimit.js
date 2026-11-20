/**
 * Rate limiter in-memory untuk percobaan login.
 *
 * Catatan: state hilang saat server restart dan tidak dibagi antar instance.
 * Untuk deployment multi-instance, ganti dengan store eksternal (Redis, dll.).
 */

function createLoginRateLimiter(options = {}) {
  const maxAttempts = options.maxAttempts || 5;
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const blockMs = options.blockMs || 15 * 60 * 1000;
  const now = options.now || Date.now;

  const entries = new Map();

  function currentEntry(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    const ts = now();
    if (entry.blockedUntil && entry.blockedUntil > ts) return entry;
    if (entry.blockedUntil && entry.blockedUntil <= ts) {
      entries.delete(key);
      return null;
    }
    if (ts - entry.firstAt > windowMs) {
      entries.delete(key);
      return null;
    }
    return entry;
  }

  function check(key) {
    const entry = currentEntry(key);
    if (entry && entry.blockedUntil && entry.blockedUntil > now()) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.blockedUntil - now()) / 1000)),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  function fail(key) {
    const ts = now();
    let entry = currentEntry(key);
    if (!entry) {
      entry = { failures: 0, firstAt: ts, blockedUntil: 0 };
      entries.set(key, entry);
    }
    entry.failures += 1;
    if (entry.failures >= maxAttempts) {
      entry.blockedUntil = ts + blockMs;
    }
    return Math.max(0, maxAttempts - entry.failures);
  }

  function reset(key) {
    entries.delete(key);
  }

  function prune() {
    const ts = now();
    for (const [key, entry] of entries) {
      const expired = entry.blockedUntil ? entry.blockedUntil <= ts : ts - entry.firstAt > windowMs;
      if (expired) entries.delete(key);
    }
  }

  const pruneTimer = setInterval(prune, 5 * 60 * 1000);
  if (typeof pruneTimer.unref === 'function') pruneTimer.unref();

  return { check, fail, reset, prune, maxAttempts, windowMs, blockMs };
}

module.exports = { createLoginRateLimiter };
