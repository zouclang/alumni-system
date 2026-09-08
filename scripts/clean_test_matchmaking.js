const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/alumni.db');
const db = new Database(DB_PATH);

const mockNames = ['林互配', '白与我', '赵我配'];

console.log('=== 开始清理喜结连理测试校友数据 ===');
let count = 0;
for (const name of mockNames) {
  const al = db.prepare("SELECT id FROM alumni WHERE name = ?").get(name);
  if (al) {
    db.prepare("DELETE FROM matchmaking_connections WHERE applicant_alumni_id = ? OR target_alumni_id = ?").run(al.id, al.id);
    db.prepare("DELETE FROM matchmaking_criteria WHERE alumni_id = ?").run(al.id);
    db.prepare("DELETE FROM matchmaking_profiles WHERE alumni_id = ?").run(al.id);
    db.prepare("DELETE FROM matchmaking_applications WHERE alumni_id = ?").run(al.id);
    db.prepare("DELETE FROM users WHERE alumni_id = ? OR username = ?").run(al.id, name);
    db.prepare("DELETE FROM alumni WHERE id = ?").run(al.id);
    console.log(`- 已清理测试校友: ${name} (ID: ${al.id})`);
    count++;
  } else {
    console.log(`- 未找到测试校友: ${name} (可能已清理)`);
  }
}

console.log(`=== 清理完毕，共清理 ${count} 个测试校友 ===`);
