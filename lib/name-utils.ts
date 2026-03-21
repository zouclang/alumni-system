import { pinyin } from 'pinyin-pro';
import { Database } from 'better-sqlite3';

/**
 * Generate pinyin for a name (no tones, lowercase, non-Zh consecutive)
 */
export function generatePinyin(name: string): string {
  if (!name) return '';
  return pinyin(name, { 
    toneType: 'none', 
    type: 'array', 
    nonZh: 'consecutive' 
  }).join('').toLowerCase();
}

/**
 * Synchronize has_duplicate_name flag for all records with the same name.
 * If multiple records share the same name, all get '是'.
 * If only one record has the name, it gets null.
 */
export function syncDuplicateStatus(db: any, name: string) {
  if (!name) return;
  
  const countRes = db.prepare('SELECT COUNT(*) as count FROM alumni WHERE name = ?').get(name) as { count: number };
  const count = countRes.count;
  
  const status = count > 1 ? '是' : null;
  db.prepare('UPDATE alumni SET has_duplicate_name = ? WHERE name = ?').run(status, name);
}

/**
 * Perform a full sync of duplicate status for all records.
 * Useful for cleanup or after bulk imports.
 */
export function syncAllDuplicates(db: any) {
  db.prepare(`
    UPDATE alumni SET has_duplicate_name = CASE 
      WHEN (SELECT COUNT(*) FROM alumni WHERE name = alumni.name) > 1 THEN '是' 
      ELSE NULL 
    END
  `).run();
}
