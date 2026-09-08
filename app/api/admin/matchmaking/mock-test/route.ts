import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

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
    // Her condition
    profile: {
      gender: 'F',
      age: 27,
      height: 166,
      weight: 50,
      hometown: '杭州',
      marital_status: '未婚',
      region: '杭州市',
      property_status: '有房有车',
      annual_income: 28,
      job_type: '高校/科研',
      degree: '硕士',
      smoking: '不吸烟',
      drinking: '不喝酒',
      schedule: '规律（早睡早起）',
      hobbies: JSON.stringify(['旅游探索', '艺术摄影', '阅读思考']),
      personality: JSON.stringify(['温柔体贴', '善解人意']),
    },
    // Her criteria for him
    criteria: {
      age_min: 28,
      age_max: 36,
      height_min: 172,
      height_max: 185,
      weight_min: 65,
      weight_max: 85,
      income_min: 30,
      marital_status: JSON.stringify(['未婚']),
      degree: '本科',
      smoking: '不吸烟',
      drinking: '不限',
      schedule: '不限',
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
    // Her condition (fully matches Zou Chunlang criteria)
    profile: {
      gender: 'F',
      age: 26,
      height: 168,
      weight: 51,
      hometown: '大连',
      marital_status: '未婚',
      region: '杭州市',
      property_status: '有房无车',
      annual_income: 36,
      job_type: '知名外企',
      degree: '硕士',
      smoking: '不吸烟',
      drinking: '偶尔小酌',
      schedule: '规律（早睡早起）',
      hobbies: JSON.stringify(['运动健身', '美食烹饪']),
      personality: JSON.stringify(['开朗自信', '独立自主']),
    },
    // Her criteria for him (Zou Chunlang does NOT meet: height 185+, income 100w+)
    criteria: {
      age_min: 28,
      age_max: 35,
      height_min: 185,
      height_max: 195,
      income_min: 100,
      marital_status: JSON.stringify(['未婚']),
      degree: '博士',
      smoking: '不吸烟',
      drinking: '不限',
      schedule: '不限',
      hobbies: JSON.stringify(['运动健身']),
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
    // Her condition (does NOT match Zou Chunlang: age 35, height 156, smoking)
    profile: {
      gender: 'F',
      age: 35,
      height: 156,
      weight: 48,
      hometown: '沈阳',
      marital_status: '未婚',
      region: '杭州市',
      property_status: '暂无房车',
      annual_income: 20,
      job_type: '民营企业',
      degree: '本科',
      smoking: '经常吸烟',
      drinking: '偶尔小酌',
      schedule: '经常熬夜',
      hobbies: JSON.stringify(['游戏电竞']),
      personality: JSON.stringify(['随性豁达']),
    },
    // Her criteria for him (Zou Chunlang fully meets)
    criteria: {
      age_min: 28,
      age_max: 38,
      height_min: 170,
      height_max: 185,
      income_min: 20,
      marital_status: JSON.stringify(['未婚']),
      degree: '大专',
      smoking: '不限',
      drinking: '不限',
      schedule: '不限',
      hobbies: JSON.stringify([]),
      personality: JSON.stringify([]),
    }
  }
];

// Check status of mock data
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: '仅管理员可查看' }, { status: 403 });
  }
  const db = getDb();
  const mockNames = MOCK_CANDIDATES.map(c => c.name);
  const placeholders = mockNames.map(() => '?').join(',');
  const existingMocks = db.prepare(`
    SELECT a.id, a.name, a.phone, a.wechat_id, u.username, mp.age, mp.height, mp.degree
    FROM alumni a
    LEFT JOIN users u ON u.alumni_id = a.id
    LEFT JOIN matchmaking_profiles mp ON mp.alumni_id = a.id
    WHERE a.name IN (${placeholders})
  `).all(...mockNames) as any[];

  const mainUser = db.prepare(`
    SELECT a.id, a.name, u.username, mp.profile_completed
    FROM alumni a
    LEFT JOIN users u ON u.alumni_id = a.id
    LEFT JOIN matchmaking_profiles mp ON mp.alumni_id = a.id
    WHERE a.name = '邹春朗'
  `).get() as any;

  return NextResponse.json({
    hasMocks: existingMocks.length > 0,
    mockCount: existingMocks.length,
    mocks: existingMocks,
    mainUser: mainUser || null
  });
}

// Generate mock data
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: '仅管理员可生成测试数据' }, { status: 403 });
  }

  const db = getDb();
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Ensure Benchmark User "邹春朗" (我)
  let mainAlumni = db.prepare("SELECT * FROM alumni WHERE name = '邹春朗'").get() as any;
  if (!mainAlumni) {
    const res = db.prepare(`
      INSERT INTO alumni (name, gender, college, enrollment_year, phone, wechat_id, status)
      VALUES ('邹春朗', '男', '经济管理学院', '1999', '18962116608', 'zoucl_wechat', 'APPROVED')
    `).run();
    mainAlumni = db.prepare("SELECT * FROM alumni WHERE id = ?").get(res.lastInsertRowid) as any;
  } else {
    // Ensure gender & phone
    db.prepare("UPDATE alumni SET gender='男', phone='18962116608', status='APPROVED' WHERE id=?").run(mainAlumni.id);
  }

  // Ensure user account
  const existingUser = db.prepare("SELECT * FROM users WHERE username = '邹春朗' OR alumni_id = ?").get(mainAlumni.id) as any;
  if (existingUser) {
    db.prepare("UPDATE users SET username = '邹春朗', password_hash = ?, status = 'APPROVED' WHERE id = ?").run(passwordHash, existingUser.id);
  } else {
    db.prepare("INSERT INTO users (username, password_hash, role, status, alumni_id) VALUES ('邹春朗', ?, 'USER', 'APPROVED', ?)").run(passwordHash, mainAlumni.id);
  }

  // Ensure matchmaking application approved
  db.prepare(`
    INSERT INTO matchmaking_applications (alumni_id, status, updated_at)
    VALUES (?, 'APPROVED', CURRENT_TIMESTAMP)
    ON CONFLICT(alumni_id) DO UPDATE SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
  `).run(mainAlumni.id);

  // Setup main user's own profile (男, 32岁, 178cm, 72kg, 硕士, 45万, 未婚, 不吸烟)
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

  // Setup main user's criteria (女, 24-30岁, 160-175cm, 45-58kg, 15-50万, 本科及以上, 未婚, 不吸烟)
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

  // 2. Insert/Update the 3 Mock Candidates
  const createdList: any[] = [];

  for (const c of MOCK_CANDIDATES) {
    let al = db.prepare("SELECT * FROM alumni WHERE name = ?").get(c.name) as any;
    if (!al) {
      const ins = db.prepare(`
        INSERT INTO alumni (name, gender, college, enrollment_year, phone, wechat_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')
      `).run(c.name, c.genderText, c.college, c.enrollment_year, c.phone, c.wechat_id);
      al = db.prepare("SELECT * FROM alumni WHERE id = ?").get(ins.lastInsertRowid) as any;
    } else {
      db.prepare("UPDATE alumni SET gender=?, college=?, enrollment_year=?, phone=?, wechat_id=?, status='APPROVED' WHERE id=?")
        .run(c.genderText, c.college, c.enrollment_year, c.phone, c.wechat_id, al.id);
    }

    // User account
    const u = db.prepare("SELECT * FROM users WHERE username = ? OR alumni_id = ?").get(c.name, al.id) as any;
    if (u) {
      db.prepare("UPDATE users SET username = ?, password_hash = ?, role = 'USER', status = 'APPROVED' WHERE id = ?").run(c.name, passwordHash, u.id);
    } else {
      db.prepare("INSERT INTO users (username, password_hash, role, status, alumni_id) VALUES (?, ?, 'USER', 'APPROVED', ?)").run(c.name, passwordHash, al.id);
    }

    // Application
    db.prepare(`
      INSERT INTO matchmaking_applications (alumni_id, status, updated_at)
      VALUES (?, 'APPROVED', CURRENT_TIMESTAMP)
      ON CONFLICT(alumni_id) DO UPDATE SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
    `).run(al.id);

    // Profile
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

    // Criteria
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

    createdList.push({
      name: c.name,
      username: c.name,
      password: '123456',
      phone: c.phone,
      wechat_id: c.wechat_id,
      matchType: c.matchType,
      description: c.description
    });
  }

  return NextResponse.json({
    success: true,
    message: '测试校友生成成功！',
    mainUser: {
      name: '邹春朗',
      username: '邹春朗',
      password: '123456',
      desc: '基准测试校友（我），已完善资料与择偶条件'
    },
    candidates: createdList
  });
}

// Clean mock data
export async function DELETE() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: '仅管理员可操作' }, { status: 403 });
  }

  const db = getDb();
  const mockNames = ['林互配', '白与我', '赵我配'];
  let deletedCount = 0;

  for (const name of mockNames) {
    const al = db.prepare("SELECT id FROM alumni WHERE name = ?").get(name) as any;
    if (al) {
      db.prepare("DELETE FROM matchmaking_connections WHERE applicant_alumni_id = ? OR target_alumni_id = ?").run(al.id, al.id);
      db.prepare("DELETE FROM matchmaking_criteria WHERE alumni_id = ?").run(al.id);
      db.prepare("DELETE FROM matchmaking_profiles WHERE alumni_id = ?").run(al.id);
      db.prepare("DELETE FROM matchmaking_applications WHERE alumni_id = ?").run(al.id);
      db.prepare("DELETE FROM users WHERE alumni_id = ? OR username = ?").run(al.id, name);
      db.prepare("DELETE FROM alumni WHERE id = ?").run(al.id);
      deletedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `成功删除 ${deletedCount} 位测试校友档案及关联账户！`
  });
}
