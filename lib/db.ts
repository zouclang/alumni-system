import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'alumni.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS alumni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seq_no INTEGER,
      name TEXT NOT NULL,
      has_duplicate_name TEXT,
      hometown TEXT,
      school_experience TEXT,
      enrollment_year TEXT,
      graduation_year TEXT,
      college TEXT,
      college_normalized TEXT,
      major TEXT,
      degree TEXT,
      phone TEXT,
      interests TEXT,
      qq TEXT,
      wechat_id TEXT,
      wechat_group TEXT,
      dut_verified TEXT,
      birth_month INTEGER,
      gender TEXT,
      region TEXT,
      career_type TEXT,
      company TEXT,
      position TEXT,
      industry TEXT,
      wechat_groups TEXT,
      social_roles TEXT,
      business_desc TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      pinyin_name TEXT,
      association_role TEXT,
      status TEXT DEFAULT 'APPROVED'
    );

    CREATE TABLE IF NOT EXISTS school_experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumni_id INTEGER NOT NULL,
      stage TEXT,
      start_year TEXT,
      end_year TEXT,
      college TEXT,
      major TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_alumni_name ON alumni(name);
    CREATE INDEX IF NOT EXISTS idx_alumni_region ON alumni(region);
    CREATE INDEX IF NOT EXISTS idx_alumni_college ON alumni(college_normalized);
    CREATE INDEX IF NOT EXISTS idx_alumni_degree ON alumni(degree);
    CREATE INDEX IF NOT EXISTS idx_alumni_gender ON alumni(gender);
    CREATE INDEX IF NOT EXISTS idx_alumni_career_type ON alumni(career_type);
    CREATE INDEX IF NOT EXISTS idx_alumni_enrollment_year ON alumni(enrollment_year);
    CREATE INDEX IF NOT EXISTS idx_alumni_pinyin_name ON alumni(pinyin_name);
    CREATE INDEX IF NOT EXISTS idx_alumni_company ON alumni(company);
    CREATE INDEX IF NOT EXISTS idx_alumni_industry ON alumni(industry);
    CREATE INDEX IF NOT EXISTS idx_se_alumni_id ON school_experiences(alumni_id);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      alumni_id INTEGER UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_alumni_id ON users(alumni_id);

    CREATE TABLE IF NOT EXISTS contact_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      target_alumni_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      admin_remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (target_alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS correction_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumni_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      admin_remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    database.exec("ALTER TABLE school_experiences ADD COLUMN major TEXT;");
  } catch(e) {}

  try {
    database.exec("ALTER TABLE alumni ADD COLUMN business_desc TEXT;");
  } catch(e) {}

  try {
    database.exec("ALTER TABLE alumni ADD COLUMN pinyin_name TEXT;");
  } catch(e) {}

  try {
    database.exec("ALTER TABLE alumni ADD COLUMN association_role TEXT;");
  } catch(e) {}

  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS contact_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER,
        target_alumni_id INTEGER,
        reason TEXT,
        status TEXT DEFAULT 'PENDING',
        admin_remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS correction_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER,
        target_alumni_id INTEGER,
        content TEXT,
        status TEXT DEFAULT 'PENDING',
        admin_remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch(e) {}

  try {
    database.exec("ALTER TABLE alumni ADD COLUMN status TEXT DEFAULT 'APPROVED';");
  } catch(e) {}

  try {
    database.exec("ALTER TABLE contact_requests ADD COLUMN user_notified INTEGER DEFAULT 0;");
  } catch(e) {}

  try {
    database.exec("ALTER TABLE correction_requests ADD COLUMN user_notified INTEGER DEFAULT 0;");
  } catch(e) {}
}
