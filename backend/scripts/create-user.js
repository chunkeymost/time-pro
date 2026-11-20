#!/usr/bin/env node
/**
 * Membuat akun login untuk Time Pro.
 *
 * Pemakaian:
 *   node scripts/create-user.js <username> --role superadmin
 *   SUPERADMIN_PASSWORD='...' node scripts/create-user.js superadmin --role superadmin
 *   npm run auth:create -- superadmin --role superadmin
 *
 * Password dibaca dari (prioritas):
 *   1. flag --password (tidak disarankan, terlihat di history shell)
 *   2. env AUTH_NEW_PASSWORD / SUPERADMIN_PASSWORD
 *   3. prompt interaktif (input disamarkan)
 */

const readline = require('readline');
const config = require('../src/config');
const { AuthStore, ROLES } = require('../src/auth/AuthStore');

function parseArgs(argv) {
  const parsed = { username: '', role: 'user', password: '' };
  const args = argv.slice(0, argv.length);
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--role') {
      parsed.role = args[i + 1] || parsed.role;
      i += 1;
    } else if (arg === '--password') {
      parsed.password = args[i + 1] || '';
      i += 1;
    } else if (arg === '--superadmin') {
      parsed.role = 'superadmin';
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  parsed.username = positional[0] || '';
  return parsed;
}

function promptText(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;

    rl._writeToOutput = function writeToOutput(text) {
      if (!muted) {
        this.output.write(text);
        return;
      }
      const isNewline = text === '\n' || text === '\r' || text === '\r\n';
      this.output.write(isNewline ? text : '*');
    };

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let username = args.username;
  let role = args.role;
  let password =
    args.password || process.env.AUTH_NEW_PASSWORD || process.env.SUPERADMIN_PASSWORD || '';

  if (!ROLES.includes(role)) {
    console.error('Role tidak valid. Pilihan: ' + ROLES.join(', '));
    process.exit(1);
  }

  if (!username) {
    username = await promptText('Username: ');
  }
  if (!password) {
    if (!process.stdin.isTTY) {
      console.error('Password kosong. Set env AUTH_NEW_PASSWORD atau pakai --password.');
      process.exit(1);
    }
    password = await promptHidden('Password: ');
    const confirmation = await promptHidden('Ulangi password: ');
    if (password !== confirmation) {
      console.error('Password tidak sama. Dibatalkan.');
      process.exit(1);
    }
  }

  const store = new AuthStore({
    filePath: config.auth.filePath,
    encryptionKey: config.auth.encryptionKey,
  });

  await store.init();

  try {
    const created = await store.createUser({ username, password, role });
    const total = await store.count();
    console.log('✓ Akun berhasil dibuat');
    console.log('  Username : ' + created.username);
    console.log('  Role     : ' + created.role);
    console.log('  Total    : ' + total + ' akun');
    console.log('  File     : ' + config.auth.filePath);
  } catch (err) {
    console.error('✗ Gagal membuat akun: ' + err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('✗ Error: ' + err.message);
  process.exit(1);
});
