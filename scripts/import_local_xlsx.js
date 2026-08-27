const Database = require('better-sqlite3');
const path = require('path');
const XLSX = require('xlsx');

// Import utilities using CommonJS for standalone script
const { pinyin } = require('pinyin-pro');

function generatePinyin(name) {
  if (!name) return null;
  const pinyinArray = pinyin(name, { toneType: 'none', type: 'array', nonZh: 'consecutive' });
  return pinyinArray.join('');
}

// syncDuplicates is no longer used

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

// Columns (Updated to match system template):
// A (0): 姓名, B (1): 家乡, C (2): 在校经历, D (3): 最高学历,
// E (4): 联系电话, F (5): 兴趣爱好, G (6): 所在微信群, H (7): 大工人认证,
// I (8): 生日月份, J (9): 性别, K (10): 所在区域, L (11): 事业类型,
// M (12): 工作单位, N (13): 职位, O (14): 所属行业, P (15): 社会职务
// Higher indices for explicit stages if present...

const insertAlumni = db.prepare(`
  INSERT INTO alumni (
    name, hometown, school_experience,
    enrollment_year, graduation_year, college, college_normalized, major,
    degree, phone, interests, wechat_id, qq, dut_verified,
    birth_month, gender, region, career_type, company, position,
    industry, social_roles, wechat_groups, pinyin_name
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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

    let normStage = stage;
    if (stage.includes('本') || stage.includes('学士')) normStage = '本科';
    else if (stage.includes('硕') || stage.includes('研')) normStage = '硕士';
    else if (stage.includes('博')) normStage = '博士';
    
    return { stage: normStage, start_year: start, end_year: end, college, major };
  });
}

function standardizeHometown(hometown) {
  return hometown || null;
}

let importedCount = 0;
const transaction = db.transaction(() => {
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = cleanValue(row[0]);
    if (!name) continue;
    
    const expStr = cleanValue(row[2]); // Adjusted for removed Column B
    const parsedExps = parseRawExperiences(expStr);
    const experiences = parsedExps.map((p, idx) => ({ ...p, sort_order: idx }));

    const firstExp = experiences[0] || {};
    const wgRaw = cleanValue(row[6]); // Adjusted

    const record = [
      name,
      standardizeHometown(cleanValue(row[1])), // Adjusted
      expStr,
      firstExp.start_year || null,
      firstExp.end_year || null,
      firstExp.college || null,
      firstExp.college || null,
      firstExp.major || null,
      cleanValue(row[3]), // Adjusted
      cleanValue(row[4]),
      cleanValue(row[5]),
      null, // wechat_id
      null, // qq
      cleanValue(row[7]),
      typeof row[8] === 'number' ? row[8] : null,
      cleanValue(row[9]),
      cleanValue(row[10]),
      cleanValue(row[11]),
      cleanValue(row[12]),
      cleanValue(row[13]),
      cleanValue(row[14]),
      cleanValue(row[15]),
      wgRaw ? String(wgRaw).replace(/、/g, ',') : null,
      generatePinyin(name)
    ];

    const result = insertAlumni.run(...record);
    const alumniId = result.lastInsertRowid;
    importedCount++;

    for (const exp of experiences) {
      insertExp.run(alumniId, exp.stage, exp.start_year, exp.end_year, exp.college, exp.major, exp.sort_order);
    }
  }
});

try {
  transaction();
  console.log('Successfully imported ' + importedCount + ' records.');
} catch (error) {
  console.error('Import transaction failed:', error);
} finally {
  db.close();
}
