const Database = require('better-sqlite3');
const { pinyin } = require('pinyin-pro');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/alumni.db');
const db = new Database(DB_PATH);

// Ensure column exists
try {
  db.exec('ALTER TABLE alumni ADD COLUMN pinyin_name TEXT');
} catch (e) {
  // Ignore if already exists
}

console.log('Fetching alumni records...');
const alumni = db.prepare('SELECT id, name FROM alumni').all();

console.log(`Processing ${alumni.length} records...`);

const updateStmt = db.prepare('UPDATE alumni SET pinyin_name = ? WHERE id = ?');

db.transaction((records) => {
  for (const record of records) {
    if (!record.name) continue;
    // Generate simple pinyin without tones, lowercase
    const py = pinyin(record.name, { 
      toneType: 'none', 
      type: 'array',
      nonZh: 'consecutive' 
    }).join('');
    updateStmt.run(py, record.id);
  }
})(alumni);

console.log('Pinyin synchronization complete.');
db.close();
