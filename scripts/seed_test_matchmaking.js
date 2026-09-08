const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/alumni.db');
const db = new Database(DB_PATH);

const MOCK_CANDIDATES = [
  {
    name: '林互配',
    genderText: '女',
    genderCode: 'F',
    college: '外国语学院',
    enrollment_year: '2016',
    phone: '13800100001',
    wechat_id: 'lin_hupei',
    matchType: 'mutual',
    description: '互相匹配（双方条件完全互符）',
    profile: {
      gender: 'F', age: 27, height: 166, weight: 50, hometown: '杭州',
      marital_status: '未婚', region: '杭州市', property_status: '有房有车',
      annual_income: 28, job_type: '高校/科研', degree: '硕士', smoking: '不吸烟',
      drinking: '不喝酒', schedule: '规律（早睡早起）',
      hobbies: JSON.stringify(['旅游探索', '艺术摄影', '阅读思考']),
      personality: JSON.stringify(['温柔体贴', '善解人意']),
    },
    criteria: {
      age_min: 28, age_max: 36, height_min: 172, height_max: 185, weight_min: 65, weight_max: 85,
      income_min: 30, marital_status: JSON.stringify(['未婚']), degree: '本科',
      smoking: '不吸烟', drinking: '不限', schedule: '不限',
      hobbies: JSON.stringify(['旅游探索', '运动健身']),
      personality: JSON.stringify(['沉稳踏实']),
    }
  },
  {
    name: '白与我',
    genderText: '女',
    genderCode: 'F',
    college: '软件学院',
    enrollment_year: '2017',
    phone: '13800100002',
    wechat_id: 'bai_yuwo',
    matchType: 'them',
    description: '与我匹配（她符合我的标准，但要求极高男方未达到）',
    profile: {
      gender: 'F', age: 26, height: 168, weight: 51, hometown: '大连',
      marital_status: '未婚', region: '杭州市', property_status: '有房无车',
      annual_income: 36, job_type: '知名外企', degree: '硕士', smoking: '不吸烟',
      drinking: '偶尔小酌', schedule: '规律（早睡早起）',
      hobbies: JSON.stringify(['运动健身', '美食烹饪']),
      personality: JSON.stringify(['开朗自信', '独立自主']),
    },
    criteria: {
      age_min: 28, age_max: 35, height_min: 185, height_max: 195, income_min: 100,
      marital_status: JSON.stringify(['未婚']), degree: '博士', smoking: '不吸烟',
      drinking: '不限', schedule: '不限', hobbies: JSON.stringify(['运动健身']),
      personality: JSON.stringify(['开朗自信']),
    }
  },
  {
    name: '赵我配',
    genderText: '女',
    genderCode: 'F',
    college: '化工学院',
    enrollment_year: '2010',
    phone: '13800100003',
    wechat_id: 'zhao_wopei',
    matchType: 'me',
    description: '我匹配的（男方符合她的标准，但她自身不符合男方标准）',
    profile: {
      gender: 'F', age: 35, height: 156, weight: 48, hometown: '沈阳',
      marital_status: '未婚', region: '杭州市', property_status: '暂无房车',
      annual_income: 20, job_type: '民营企业', degree: '本科', smoking: '经常吸烟',
      drinking: '偶尔小酌', schedule: '经常熬夜',
      hobbies: JSON.stringify(['游戏电竞']),
      personality: JSON.stringify(['随性豁达']),
    },
    criteria: {
      age_min: 28, age_max: 38, height_min: 170, height_max: 185, income_min: 20,
      marital_status: JSON.stringify(['未婚']), degree: '大专', smoking: '不限',
      drinking: '不限', schedule: '不限', hobbies: JSON.stringify([]), personality: JSON.stringify([]),
    }
  }
];

async function seed() {
  console.log('=== 开始生成喜结连理测试校友数据 ===');
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. 基准校友 "邹春朗"
  let mainAlumni = db.prepare("SELECT * FROM alumni WHERE name = '邹春朗'").get();
  if (!mainAlumni) {
    const res = db.prepare(`
      INSERT INTO alumni (name, gender, college, enrollment_year, phone, wechat_id, status)
      VALUES ('邹春朗', '男', '经济管理学院', '1999', '18962116608', 'zoucl_wechat', 'APPROVED')
    `).run();
    mainAlumni = db.prepare("SELECT * FROM alumni WHERE id = ?").get(res.lastInsertRowid);
  } else {
    db.prepare("UPDATE alumni SET gender='男', phone='18962116608', status='APPROVED' WHERE id=?").run(mainAlumni.id);
  }

  const existingUser = db.prepare("SELECT * FROM users WHERE username = '邹春朗' OR alumni_id = ?").get(mainAlumni.id);
  if (existingUser) {
    db.prepare("UPDATE users SET username = '邹春朗', password_hash = ?, status = 'APPROVED' WHERE id = ?").run(passwordHash, existingUser.id);
  } else {
    db.prepare("INSERT INTO users (username, password_hash, role, status, alumni_id) VALUES ('邹春朗', ?, 'USER', 'APPROVED', ?)").run(passwordHash, mainAlumni.id);
  }

  db.prepare(`
    INSERT INTO matchmaking_applications (alumni_id, status, updated_at)
    VALUES (?, 'APPROVED', CURRENT_TIMESTAMP)
    ON CONFLICT(alumni_id) DO UPDATE SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
  `).run(mainAlumni.id);

  db.prepare(`
    INSERT INTO matchmaking_profiles (
      alumni_id, gender, age, height, weight, hometown, marital_status, region,
      property_status, annual_income, job_type, degree, smoking, drinking,
      schedule, hobbies, personality, profile_completed, is_active, updated_at
    ) VALUES (
      ?, 'M', 32, 178, 72, '大连', '未婚', '杭州市',
      '有房有车', 45, '国企/互联网', '硕士', '不吸烟', '偶尔小酌',
      '规律（早睡早起）', '["旅游探索","运动健身","阅读思考"]', '["开朗自信","沉稳踏实"]', 1, 1, CURRENT_TIMESTAMP
    )
    ON CONFLICT(alumni_id) DO UPDATE SET
      gender='M', age=32, height=178, weight=72, marital_status='未婚',
      annual_income=45, degree='硕士', smoking='不吸烟', drinking='偶尔小酌',
      schedule='规律（早睡早起）', hobbies='["旅游探索","运动健身","阅读思考"]',
      personality='["开朗自信","沉稳踏实"]', profile_completed=1, is_active=1, updated_at=CURRENT_TIMESTAMP
  `).run(mainAlumni.id);

  db.prepare(`
    INSERT INTO matchmaking_criteria (
      alumni_id, age_min, age_max, height_min, height_max, weight_min, weight_max,
      income_min, income_max, marital_status, degree, smoking, drinking,
      schedule, hobbies, personality, criteria_completed, updated_at
    ) VALUES (
      ?, 24, 30, 160, 175, 45, 58,
      15, 50, '["未婚"]', '本科', '不吸烟', '不限',
      '不限', '["旅游探索","运动健身"]', '["温柔体贴","开朗自信"]', 1, CURRENT_TIMESTAMP
    )
    ON CONFLICT(alumni_id) DO UPDATE SET
      age_min=24, age_max=30, height_min=160, height_max=175, weight_min=45, weight_max=58,
      income_min=15, income_max=50, marital_status='["未婚"]', degree='本科', smoking='不吸烟',
      drinking='不限', schedule='不限', hobbies='["旅游探索","运动健身"]',
      personality='["温柔体贴","开朗自信"]', criteria_completed=1, updated_at=CURRENT_TIMESTAMP
  `).run(mainAlumni.id);

  console.log(`[主测试校友] 邹春朗 (ID: ${mainAlumni.id}) - 账号: 邹春朗, 密码: 123456 (已配好自身条件与择偶标准)`);

  // 2. 候选人
  for (const c of MOCK_CANDIDATES) {
    let al = db.prepare("SELECT * FROM alumni WHERE name = ?").get(c.name);
    if (!al) {
      const ins = db.prepare(`
        INSERT INTO alumni (name, gender, college, enrollment_year, phone, wechat_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')
      `).run(c.name, c.genderText, c.college, c.enrollment_year, c.phone, c.wechat_id);
      al = db.prepare("SELECT * FROM alumni WHERE id = ?").get(ins.lastInsertRowid);
    } else {
      db.prepare("UPDATE alumni SET gender=?, college=?, enrollment_year=?, phone=?, wechat_id=?, status='APPROVED' WHERE id=?")
        .run(c.genderText, c.college, c.enrollment_year, c.phone, c.wechat_id, al.id);
    }

    const u = db.prepare("SELECT * FROM users WHERE username = ? OR alumni_id = ?").get(c.name, al.id);
    if (u) {
      db.prepare("UPDATE users SET username = ?, password_hash = ?, role = 'USER', status = 'APPROVED' WHERE id = ?").run(c.name, passwordHash, u.id);
    } else {
      db.prepare("INSERT INTO users (username, password_hash, role, status, alumni_id) VALUES (?, ?, 'USER', 'APPROVED', ?)").run(c.name, passwordHash, al.id);
    }

    db.prepare(`
      INSERT INTO matchmaking_applications (alumni_id, status, updated_at)
      VALUES (?, 'APPROVED', CURRENT_TIMESTAMP)
      ON CONFLICT(alumni_id) DO UPDATE SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
    `).run(al.id);

    const p = c.profile;
    db.prepare(`
      INSERT INTO matchmaking_profiles (
        alumni_id, gender, age, height, weight, hometown, marital_status, region,
        property_status, annual_income, job_type, degree, smoking, drinking,
        schedule, hobbies, personality, profile_completed, is_active, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 1, 1, CURRENT_TIMESTAMP
      )
      ON CONFLICT(alumni_id) DO UPDATE SET
        gender=?, age=?, height=?, weight=?, hometown=?, marital_status=?, region=?,
        property_status=?, annual_income=?, job_type=?, degree=?, smoking=?, drinking=?,
        schedule=?, hobbies=?, personality=?, profile_completed=1, is_active=1, updated_at=CURRENT_TIMESTAMP
    `).run(
      al.id, p.gender, p.age, p.height, p.weight, p.hometown, p.marital_status, p.region,
      p.property_status, p.annual_income, p.job_type, p.degree, p.smoking, p.drinking,
      p.schedule, p.hobbies, p.personality,
      p.gender, p.age, p.height, p.weight, p.hometown, p.marital_status, p.region,
      p.property_status, p.annual_income, p.job_type, p.degree, p.smoking, p.drinking,
      p.schedule, p.hobbies, p.personality
    );

    const cr = c.criteria;
    db.prepare(`
      INSERT INTO matchmaking_criteria (
        alumni_id, age_min, age_max, height_min, height_max, weight_min, weight_max,
        income_min, marital_status, degree, smoking, drinking,
        schedule, hobbies, personality, criteria_completed, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, 1, CURRENT_TIMESTAMP
      )
      ON CONFLICT(alumni_id) DO UPDATE SET
        age_min=?, age_max=?, height_min=?, height_max=?, weight_min=?, weight_max=?,
        income_min=?, marital_status=?, degree=?, smoking=?, drinking=?,
        schedule=?, hobbies=?, personality=?, criteria_completed=1, updated_at=CURRENT_TIMESTAMP
    `).run(
      al.id, cr.age_min || null, cr.age_max || null, cr.height_min || null, cr.height_max || null, cr.weight_min || null, cr.weight_max || null,
      cr.income_min || null, cr.marital_status || '[]', cr.degree || null, cr.smoking || '不限', cr.drinking || '不限',
      cr.schedule || '不限', cr.hobbies || '[]', cr.personality || '[]',
      cr.age_min || null, cr.age_max || null, cr.height_min || null, cr.height_max || null, cr.weight_min || null, cr.weight_max || null,
      cr.income_min || null, cr.marital_status || '[]', cr.degree || null, cr.smoking || '不限', cr.drinking || '不限',
      cr.schedule || '不限', cr.hobbies || '[]', cr.personality || '[]'
    );

    console.log(`[测试校友 - ${c.description}] 姓名: ${c.name}, 账号: ${c.name}, 密码: 123456, 微信: ${c.wechat_id}`);
  }

  console.log('\n=== 测试数据注入完成！===');
  console.log('测试方式：');
  console.log('1. 登录用户名【邹春朗】，密码【123456】，进入【喜结连理】：');
  console.log('   - 互相匹配 Tab：应显示【林互配】');
  console.log('   - 与我匹配 Tab：应显示【白与我】');
  console.log('   - 我匹配的 Tab：应显示【赵我配】');
  console.log('2. 亦可登录任一候选人账号（密码均为 123456）进行逆向交叉验证。');
  console.log('3. 清理时执行: node scripts/clean_test_matchmaking.js');
}

seed().catch(console.error);
