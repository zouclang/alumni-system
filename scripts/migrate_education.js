const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'alumni.db');
const db = new Database(DB_PATH);

console.log('Connecting to database:', DB_PATH);

// Get all alumni who DON'T have any school_experiences
const alumniWithoutExp = db.prepare(`
  SELECT id, college, college_normalized, major, enrollment_year, graduation_year 
  FROM alumni a
  WHERE NOT EXISTS (
    SELECT 1 FROM school_experiences e WHERE e.alumni_id = a.id
  ) AND (college IS NOT NULL OR college_normalized IS NOT NULL OR major IS NOT NULL OR enrollment_year IS NOT NULL)
`).all();

console.log(`Found ${alumniWithoutExp.length} alumni requiring migration.`);

const insertExp = db.prepare(`
  INSERT INTO school_experiences (alumni_id, stage, start_year, end_year, college, major, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let migrated = 0;
const transaction = db.transaction((rows) => {
  for (const row of rows) {
    insertExp.run(
      row.id,
      '', // stage
      row.enrollment_year || null,
      row.graduation_year || null,
      row.college_normalized || row.college || null,
      row.major || null,
      0 // sort_order
    );
    migrated++;
  }
});

try {
  transaction(alumniWithoutExp);
  console.log(`Successfully migrated ${migrated} alumni records.`);
} catch (e) {
  console.error('Migration failed:', e);
}
