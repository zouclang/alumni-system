const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { pinyin } = require('pinyin-pro');

const DB_PATH = path.join(__dirname, '..', 'data', 'alumni.db');
const EXCEL_PATH = '/Users/zoucl/Downloads/dut/loacal.xlsx';

function cleanValue(val) {
  if (val === null || val === undefined) return null;
  let s = String(val).trim();
  if (s === '' || s === 'None' || s.startsWith('=')) return null;
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return s;
}

function cleanYear(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  const m = s.match(/(\d{4})/);
  return m ? m[1] : null;
}

function generatePinyin(name) {
  if (!name) return '';
  return pinyin(name, { 
    toneType: 'none', 
    type: 'array', 
    nonZh: 'consecutive' 
  }).join('').toLowerCase();
}

function standardizeHometown(val) {
  if (!val) return val;
  const parts = val.split('-');
  let province = parts[0]?.trim();
  let rest = parts[1]?.trim() || '';
  if (!province || !rest) return val;

  const provinceSuffixes = {
    '北京': '北京市', '上海': '上海市', '天津': '天津市', '重庆': '重庆市',
    '内蒙古': '内蒙古自治区', '西藏': '西藏自治区', '宁夏': '宁夏回族自治区', '新疆': '新疆维吾尔自治区', '广西': '广西壮族自治区',
    '香港': '香港特别行政区', '澳门': '澳门特别行政区'
  };
  
  if (provinceSuffixes[province]) {
    province = provinceSuffixes[province];
  } else if (!province.endsWith('省') && !province.endsWith('市') && !province.endsWith('自治区') && !province.endsWith('区')) {
    province = province + '省';
  }

  const countyToPrefecture = {
    '昆山': '苏州', '常熟': '苏州', '张家港': '苏州', '太仓': '苏州', '吴江': '苏州', '吴中': '苏州', '相城': '苏州', '姑苏': '苏州', '虎丘': '苏州',
    '江阴': '无锡', '宜兴': '无锡', '滨湖': '无锡',
    '溧阳': '常州', '金坛': '常州', '武进': '常州',
    '丹阳': '镇江', '扬中': '镇江', '句容': '镇江',
    '泰兴': '泰州', '靖江': '泰州', '兴化': '泰州', '姜堰': '泰州',
    '启东': '南通', '如皋': '南通', '海门': '南通', '海安': '南通', '如东': '南通', '通州': '南通',
    '邳州': '徐州', '新沂': '徐州', '丰县': '徐州', '沛县': '徐州', '睢宁': '徐州', '铜山': '徐州',
    '东台': '盐城', '建湖': '盐城', '响水': '盐城', '阜宁': '盐城', '射阳': '盐城', '滨海': '盐城', '大丰': '盐城',
    '仪征': '扬州', '高邮': '扬州', '宝应': '扬州', '江都': '扬州',
    '东海': '连云港', '灌云': '连云港', '灌南': '连云港', '赣榆': '连云港',
    '沭阳': '宿迁', '泗阳': '宿迁', '泗洪': '宿迁',
    '瓦房店': '大连', '普兰店': '大连', '庄河': '大连', '金州': '大连',
    '海城': '鞍山', '诸暨': '绍兴', '永康': '金华'
  };

  const prefecturalCities = [
    '苏州', '无锡', '常州', '镇江', '泰州', '南通', '徐州', '盐城', '扬州', '连云港', '淮安', '宿迁', '南京',
    '大连', '沈阳', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛',
    '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
    '合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城',
    '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽',
    '郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店',
    '武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施',
    '长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西',
    '成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '阿坝', '甘孜', '凉山',
    '西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛',
    '广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆', '江门', '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮',
    '福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德',
    '南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶',
    '南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左',
    '昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '红河', '文山', '西双版纳', '大理', '楚雄', '德宏', '怒江', '迪庆',
    '贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南',
    '兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南',
    '西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西',
    '银川', '石嘴山', '吴忠', '固原', '中卫',
    '乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '克孜勒苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰',
    '呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安盟', '锡林郭勒盟', '阿拉善盟',
    '石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水',
    '太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁',
    '长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边',
    '哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江', '黑河', '绥化', '大兴安岭',
    '海口', '三亚', '三沙', '儋州'
  ];

  const autonomousAndSpecial = [
    '延边', '黔西南', '黔东南', '黔南', '大理', '楚雄', '红河', '文山', 
    '西双版纳', '德宏', '怒江', '迪庆', '恩施', '湘西', '阿坝', '甘孜', 
    '凉山', '海北', '黄南', '海南', '果洛', '玉树', '海西', '昌吉', 
    '博尔塔拉', '巴音郭楞', '克孜勒苏', '伊犁', '兴安盟', '锡林郭勒盟', '阿拉善盟', '大兴安岭'
  ];

  for (const anchor of prefecturalCities) {
    if (rest.includes(anchor)) {
      if (autonomousAndSpecial.includes(anchor)) {
        rest = `${anchor}${anchor.endsWith('盟') || anchor.endsWith('地区') || anchor.endsWith('州') ? '' : '州'}`;
        return `${province}-${rest}`;
      }
      rest = `${anchor}市`;
      return `${province}-${rest}`;
    }
  }

  for (const county in countyToPrefecture) {
    if (rest.includes(county)) {
      rest = `${countyToPrefecture[county]}市`;
      return `${province}-${rest}`;
    }
  }

  if (rest && !rest.endsWith('市') && !rest.endsWith('州') && !rest.endsWith('盟') && !rest.endsWith('地区')) {
    rest = rest + '市';
  }

  return `${province}-${rest}`;
}

function parseExperiences(expStr) {
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
      stage = parts[0]?.trim() || '';
      const years = parts[1]?.trim() || '';
      if (years.includes('-')) {
        const yParts = years.split('-');
        const sPart = yParts[0]?.trim();
        const ePart = yParts[1]?.trim();
        start = sPart ? (sPart.match(/^\d{4}/)?.[0] || null) : null;
        end = ePart ? (ePart.match(/^\d{4}/)?.[0] || null) : (years.includes('-') && years.trim().endsWith('-') ? '?' : null);
      } else {
        start = cleanYear(years);
      }
    }

    const collegeParts = rest.split('-').map(s => s.trim());
    const college = collegeParts[0] || null;
    const major = collegeParts[1] || null;

    return { stage, start_year: start, end_year: end, college, major, sort_order: i };
  });
}

async function run() {
  console.log(`Starting Database Reset and Re-import...`);
  console.log(`DB Path: ${DB_PATH}`);
  console.log(`Excel Path: ${EXCEL_PATH}`);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`Error: Excel file not found at ${EXCEL_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // 1. Wipe Tables
  console.log(`Wiping current data...`);
  db.prepare(`DELETE FROM contact_requests`).run();
  db.prepare(`DELETE FROM correction_requests`).run();
  db.prepare(`DELETE FROM users WHERE role != 'ADMIN'`).run();
  db.prepare(`DELETE FROM school_experiences`).run();
  db.prepare(`DELETE FROM alumni`).run();
  console.log(`Data wiped successfully.`);

  // 2. Read Excel
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rows.length < 2) {
    console.error(`Error: Excel file is empty or missing headers.`);
    process.exit(1);
  }

  const headers = rows[0].map(h => (typeof h === 'string' ? h.trim() : h));
  const colMap = {};
  headers.forEach((h, i) => { if (h) colMap[h] = i; });

  const getRowVal = (row, name, fallbackIdx) => {
    if (name in colMap) return row[colMap[name]];
    return row[fallbackIdx];
  };

  const insertAlumni = db.prepare(`
    INSERT INTO alumni (
      seq_no, name, hometown, school_experience,
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

  let importedCount = 0;
  const transaction = db.transaction((data) => {
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const nameRaw = getRowVal(row, '姓名', 1);
        const name = cleanValue(nameRaw);
        if (!name) continue;

        const cleanedName = String(name).replace(/\d+$/, '');
        
        // Use ONLY '在校经历' as requested
        const expRaw = getRowVal(row, '在校经历', 4);
        const parsedExps = parseExperiences(cleanValue(expRaw));
        const experiences = parsedExps.map((p, idx) => ({ ...p, sort_order: idx }));

        const firstExp = experiences[0] || {};
        const wgRaw = getRowVal(row, '所在微信群', 8);

        const record = [
          getRowVal(row, '序号', 0) || i,
          cleanedName,
          standardizeHometown(cleanValue(getRowVal(row, '家乡', 3))),
          cleanValue(expRaw),
          firstExp.start_year || null,
          firstExp.end_year || null,
          firstExp.college || null,
          firstExp.college || null,
          firstExp.major || null,
          cleanValue(getRowVal(row, '最高学历', 5)),
          cleanValue(getRowVal(row, '联系电话', 6)),
          cleanValue(getRowVal(row, '兴趣爱好', 7)),
          cleanValue(wgRaw) ? String(wgRaw).replace(/、/g, ',') : null,
          cleanValue(getRowVal(row, '大工人认证', 9)),
          typeof getRowVal(row, '生日月份', 10) === 'number' ? getRowVal(row, '生日月份', 10) : null,
          cleanValue(getRowVal(row, '性别', 11)),
          cleanValue(getRowVal(row, '所在区域', 12)),
          cleanValue(getRowVal(row, '事业类型', 13)),
          cleanValue(getRowVal(row, '工作单位', 14)),
          cleanValue(getRowVal(row, '职位', 15)),
          cleanValue(getRowVal(row, '所属行业', 16)),
          cleanValue(getRowVal(row, '社会职务', 17)),
          generatePinyin(cleanedName)
        ];

        const result = insertAlumni.run(...record);
        const alumniId = result.lastInsertRowid;
        importedCount++;

        for (const exp of experiences) {
          insertExp.run(alumniId, exp.stage, exp.start_year, exp.end_year, exp.college, exp.major, exp.sort_order);
        }
    }
    
    console.log(`Import complete.`);
  });

  transaction(rows);

  console.log(`Successfully imported ${importedCount} records.`);
  db.close();
}

run().catch(err => {
  console.error(`Import failed:`, err);
  process.exit(1);
});
