const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/alumni.db');
const db = new Database(DB_PATH);

async function initAdmin() {
  const username = 'duters';
  const password = 'szdut1949';
  const role = 'ADMIN';
  const status = 'APPROVED';

  console.log(`Checking if admin user "${username}" exists...`);
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (existing) {
    console.log('Admin user already exists. Updating password...');
    const hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ?, role = ?, status = ? WHERE username = ?')
      .run(hash, role, status, username);
  } else {
    console.log('Creating new admin user...');
    const hash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)')
      .run(username, hash, role, status);
  }

  console.log('Admin initialization complete.');
  db.close();
}

initAdmin().catch(console.error);
