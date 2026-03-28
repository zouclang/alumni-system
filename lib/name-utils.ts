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

