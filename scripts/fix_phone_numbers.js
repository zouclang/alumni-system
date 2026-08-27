const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'alumni.db');
const db = new Database(DB_PATH);

console.log('Starting data cleanup for phone, qq, and wechat_id fields...');

const columns = ['phone', 'qq', 'wechat_id'];

let totalFixed = 0;

db.transaction(() => {
  columns.forEach(col => {
    const rows = db.prepare(`SELECT id, ${col} FROM alumni WHERE ${col} LIKE '%.0'`).all();
    console.log(`Checking column [${col}]: Found ${rows.length} records with .0 suffix.`);
    
    const updateStmt = db.prepare(`UPDATE alumni SET ${col} = ? WHERE id = ?`);
    
    rows.forEach(row => {
      const oldValue = row[col];
      const newValue = oldValue.slice(0, -2);
      updateStmt.run(newValue, row.id);
      totalFixed++;
    });
  });
})();

console.log(`Cleanup complete. Total fields corrected: ${totalFixed}`);
