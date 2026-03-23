const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'data', 'alumni.db'));

db.prepare('DELETE FROM school_experiences').run();
db.prepare("DELETE FROM users WHERE role != 'ADMIN'").run();
db.prepare('DELETE FROM alumni').run();
db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('alumni', 'school_experiences', 'users')").run();

console.log('✅ 所有校友数据和普通账号已被彻底安全清空！(已为您保留 Admin 管理员账号)');
