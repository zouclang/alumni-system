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
  let s = String(val).trim();
  if (s === '' || s === 'None' || s.startsWith('=')) return null;
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return s;
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

// Parse years from string like "【本科:1978-1982】" or "【:2013-】"
function parseRawExperiences(expStr) {
  if (!expStr) return [];
  const segments = expStr.split('|');
  return segments.map((seg, i) => {
    const m = seg.match(/【(.*?)】/);
    let stage = '';
    let start = null;
    let end = null;
    let rest = seg;
    if (m) {
      const inner = m[1];
      rest = seg.replace(m[0], '').trim();
      const parts = inner.split(':');
      stage = parts[0] ? parts[0].trim() : '';
      const years = parts[1] ? parts[1].trim() : '';
      if (years.includes('-')) {
        const yParts = years.split('-');
        start = yParts[0]?.substring(0, 4) || null;
        if (!start && yParts[0]) start = yParts[0]; // fallback
        end = yParts[1]?.substring(0, 4) || null;
        if (!end && yParts[1]) end = yParts[1];
      } else {
        const yr = years.match(/\d{4}/);
        if (yr) start = yr[0];
      }
    }

    const collegeParts = rest.split('-').map(s => s.trim());
    const college = collegeParts[0] || null;
    const major = collegeParts[1] || null;

    // Normalize stage matching for the internal 'getDates' lookup
    let normStage = stage;
    if (stage.includes('本') || stage.includes('学士')) normStage = '本科';
    else if (stage.includes('硕') || stage.includes('研')) normStage = '硕士';
    else if (stage.includes('博')) normStage = '博士';
    else if (stage === '') normStage = ''; // unknown

    return { stage: normStage, start_year: start, end_year: end, college, major };
  });
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
    const parsedExps = parseRawExperiences(expStr);
    const usedParsedIndices = new Set();

    // Mapping for explicit columns
    const explicitStages = [
      { name: '本科', col: bCol, maj: bMaj },
      { name: '硕士', col: mCol, maj: mMaj },
      { name: '博士', col: dCol, maj: dMaj },
      { name: '', col: uCol, maj: uMaj }
    ];

    explicitStages.forEach(ex => {
       const parsedIdx = parsedExps.findIndex(p => p.stage === ex.name);
       const p = parsedIdx !== -1 ? parsedExps[parsedIdx] : null;
       
       if (ex.col || ex.maj || p) {
         if (parsedIdx !== -1) usedParsedIndices.add(parsedIdx);
         experiences.push({
           stage: ex.name,
           start_year: p ? p.start_year : null,
           end_year: p ? p.end_year : null,
           college: ex.col || (p ? p.college : null),
           major: ex.maj || (p ? p.major : null),
           sort_order: sort++
         });
       }
    });

    // Add remaining parsed experiences that weren't matched to explicit columns
    parsedExps.forEach((p, idx) => {
       if (!usedParsedIndices.has(idx)) {
         experiences.push({
           ...p,
           sort_order: idx + 10 // ensure they come after if appropriate, but sort order is relative
         });
       }
    });

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
      firstExp.college || null, // college_normalized
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
