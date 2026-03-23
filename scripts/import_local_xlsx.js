const Database = require('better-sqlite3');
const path = require('path');
const XLSX = require('xlsx');

// Import utilities using CommonJS for standalone script
// Need a quick generatePinyin function and syncDuplicate function
const { pinyin } = require('pinyin-pro');

function generatePinyin(name) {
  if (!name) return null;
  const pinyinArray = pinyin(name, { toneType: 'none', type: 'array', nonZh: 'consecutive' });
  return pinyinArray.join('');
}

function syncAllDuplicates(db) {
  const duplicates = db.prepare(`SELECT name FROM alumni GROUP BY name HAVING COUNT(*) > 1`).all();
  const dupNames = duplicates.map(d => d.name);

  db.prepare(`UPDATE alumni SET has_duplicate_name = '否'`).run();

  if (dupNames.length > 0) {
    const placeholders = dupNames.map(() => '?').join(',');
    db.prepare(`UPDATE alumni SET has_duplicate_name = '是' WHERE name IN (${placeholders})`).run(...dupNames);
  }
}

function cleanValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const s = val.trim();
    if (s === '' || s === 'None' || s.startsWith('=')) return null;
    return s;
  }
  return val;
}

const DB_PATH = path.join(process.cwd(), 'data', 'alumni.db');
const db = new Database(DB_PATH);

const FILE_PATH = path.join(process.cwd(), '..', 'loacal.xlsx');
console.log('Reading Excel file from:', FILE_PATH);

let workbook;
try {
  workbook = XLSX.readFile(FILE_PATH);
} catch (e) {
  console.error("Failed to read Excel file. Make sure it exists at:", FILE_PATH);
  process.exit(1);
}

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length < 2) {
  console.error('File is empty or missing data headers.');
  process.exit(1);
}

// Columns:
// A (0): 姓名, B (1): 是否重名, C (2): 家乡, D (3): 在校经历, E (4): 最高学历,
// F (5): 联系电话, G (6): 兴趣爱好, H (7): 所在微信群, I (8): 大工人认证,
// J (9): 生日月份, K (10): 性别, L (11): 所在区域, M (12): 事业类型,
// N (13): 工作单位, O (14): 职位, P (15): 所属行业, Q (16): 社会职务,
// R (17): 本科学院, S (18): 本科专业, T (19): 硕士学院, U (20): 硕士专业,
// V (21): 博士学院, W (22): 博士专业, X (23): 未知学段学院, Y (24): 未知学段专业

const insertAlumni = db.prepare(`
  INSERT INTO alumni (
    name, has_duplicate_name, hometown, school_experience,
    enrollment_year, graduation_year, college, college_normalized, major,
    degree, phone, interests, wechat_groups, dut_verified,
    birth_month, gender, region, career_type, company, position,
    industry, social_roles, pinyin_name
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

const insertExp = db.prepare(`
  INSERT INTO school_experiences (alumni_id, stage, start_year, end_year, college, major, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Parse years from string like "【本科:1978-1982】"
function extractStageYears(expStr, stageName) {
  if (!expStr) return { start: null, end: null };
  const segments = expStr.split('|');
  for (const seg of segments) {
    const m = seg.match(/【(.*?)】/);
    if (!m) continue;
    const inner = m[1]; // e.g. "本科:1978-1982" or "本科" or "1978-1982"
    // Does it belong to this stage?
    // If it contains the stageName (e.g. "本"), or if we are aggressive we can check for other things.
    let isMatch = false;
    if (stageName === '本科' && (inner.includes('本') || inner.includes('学士'))) isMatch = true;
    if (stageName === '硕士' && (inner.includes('硕') || inner.includes('研'))) isMatch = true;
    if (stageName === '博士' && inner.includes('博')) isMatch = true;
    
    if (isMatch) {
      const parts = inner.split(':');
      const years = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      let start = null, end = null;
      
      const yearMatch = years.match(/(\d{4})/g);
      if (yearMatch && yearMatch.length === 2) {
        start = yearMatch[0];
        end = yearMatch[1];
      } else if (yearMatch && yearMatch.length === 1) {
        start = yearMatch[0];
      }
      return { start, end };
    }
  }
  return { start: null, end: null };
}

let importedCount = 0;
const transaction = db.transaction(() => {
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = cleanValue(row[0]); // A: 姓名
    if (!name) continue;
    
    const expStr = cleanValue(row[3]); // D: 在校经历

    const bCol = cleanValue(row[17]); // R
    const bMaj = cleanValue(row[18]); // S
    const mCol = cleanValue(row[19]); // T
    const mMaj = cleanValue(row[20]); // U
    const dCol = cleanValue(row[21]); // V
    const dMaj = cleanValue(row[22]); // W
    const uCol = cleanValue(row[23]); // X
    const uMaj = cleanValue(row[24]); // Y

    let experiences = [];
    let sort = 0;

    if (bCol || bMaj) {
      const { start, end } = extractStageYears(expStr, '本科');
      experiences.push({ stage: '本科', start_year: start, end_year: end, college: bCol, major: bMaj, sort_order: sort++ });
    }
    if (mCol || mMaj) {
      const { start, end } = extractStageYears(expStr, '硕士');
      experiences.push({ stage: '硕士', start_year: start, end_year: end, college: mCol, major: mMaj, sort_order: sort++ });
    }
    if (dCol || dMaj) {
      const { start, end } = extractStageYears(expStr, '博士');
      experiences.push({ stage: '博士', start_year: start, end_year: end, college: dCol, major: dMaj, sort_order: sort++ });
    }
    if (uCol || uMaj) {
      experiences.push({ stage: '', start_year: null, end_year: null, college: uCol, major: uMaj, sort_order: sort++ });
    }

    const firstExp = experiences[0] || {};
    
    let province = null;
    let restHometown = null;
    let hometownRaw = cleanValue(row[2]);
    if (hometownRaw) {
       // Simple mapping just passing it through since standardizeHometown is complex
       // We can just save it as is and the website will render it.
    }

    const wgRaw = cleanValue(row[7]);

    const record = [
      name, // cleanedName
      cleanValue(row[1]), // has_duplicate_name
      hometownRaw, // hometown
      expStr, // school_experience
      firstExp.start_year || null,
      firstExp.end_year || null,
      firstExp.college || null,
      firstExp.college || null,
      firstExp.major || null,
      cleanValue(row[4]), // degree
      cleanValue(row[5]), // phone
      cleanValue(row[6]), // interests
      wgRaw ? String(wgRaw).replace(/、/g, ',') : null, // wechat_groups
      cleanValue(row[8]), // dut_verified
      typeof row[9] === 'number' ? row[9] : null, // birth_month
      cleanValue(row[10]), // gender
      cleanValue(row[11]), // region
      cleanValue(row[12]), // career_type
      cleanValue(row[13]), // company
      cleanValue(row[14]), // position
      cleanValue(row[15]), // industry
      cleanValue(row[16]), // social_roles
      generatePinyin(name) // pinyin_name
    ];

    const result = insertAlumni.run(...record);
    const alumniId = result.lastInsertRowid;
    importedCount++;

    for (const exp of experiences) {
      insertExp.run(alumniId, exp.stage, exp.start_year, exp.end_year, exp.college, exp.major, exp.sort_order);
    }
  }
  syncAllDuplicates(db);
});

try {
  transaction();
  console.log('Successfully imported ' + importedCount + ' records from loacal.xlsx.');
} catch (error) {
  console.error('Import transaction failed:', error);
}
