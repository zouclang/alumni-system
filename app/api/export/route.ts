import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || '';
    const college = searchParams.get('college') || '';
    const degree = searchParams.get('degree') || '';
    const gender = searchParams.get('gender') || '';
    const careerType = searchParams.get('careerType') || '';
    const wechatGroup = searchParams.get('wechatGroup') || '';
    const registered = searchParams.get('registered') || '';

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push('(name LIKE ? OR company LIKE ? OR position LIKE ? OR phone LIKE ? OR qq LIKE ? OR wechat_id LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like);
    }
    if (region) { conditions.push('region = ?'); params.push(region); }
    if (college) { conditions.push('college_normalized = ?'); params.push(college); }
    if (degree) { conditions.push('degree LIKE ?'); params.push(`%${degree}%`); }
    if (gender) { conditions.push('gender = ?'); params.push(gender); }
    if (careerType) { conditions.push('career_type = ?'); params.push(careerType); }
    if (wechatGroup) { conditions.push("(',' || wechat_groups || ',') LIKE ?"); params.push(`%,${wechatGroup},%`); }
    
    if (registered === 'yes') {
      conditions.push('EXISTS (SELECT 1 FROM users WHERE alumni_id = a.id)');
    } else if (registered === 'no') {
      conditions.push('NOT EXISTS (SELECT 1 FROM users WHERE alumni_id = a.id)');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(`SELECT * FROM alumni a ${where} ORDER BY a.pinyin_name ASC`).all(...params) as Record<string, unknown>[];
    const expStmt = db.prepare('SELECT * FROM school_experiences WHERE alumni_id = ? ORDER BY sort_order ASC');

    // Build CSV matching the user requested limited columns
    const headers = [
      '姓名', '是否重名', '家乡', '在校经历', '最高学历', 
      '联系电话', '兴趣爱好', '所在微信群', '大工人认证', 
      '生日月份', '性别', '所在区域', '事业类型', 
      '工作单位', '职位', '所属行业', '社会职务',
      // TEMPORARY FIELDS for template generation per user request
      '本科学院', '本科专业', '硕士学院', '硕士专业', '博士学院', '博士专业',
      '未知学段学院', '未知学段专业'
    ];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      // Get and format structured experiences matching the system's integrated format
      const experiences = expStmt.all(row.id) as any[];
      
      // Temporary variables for explicit stage extraction
      let bCollege = '', bMajor = '';
      let mCollege = '', mMajor = '';
      let dCollege = '', dMajor = '';
      let uCollege = '', uMajor = '';

      const expStrs = experiences.map(e => {
        const stage = e.stage || '';
        const years = `${e.start_year || ''}-${e.end_year || ''}`;
        const college = e.college || '';
        const major = e.major || '';
        
        // Extract specific stages for the temporary fields
        if (stage.includes('本') && !bCollege) { bCollege = college; bMajor = major; }
        else if ((stage.includes('硕') || stage.includes('研')) && !mCollege) { mCollege = college; mMajor = major; }
        else if (stage.includes('博') && !dCollege) { dCollege = college; dMajor = major; }
        else if (!uCollege) { // Fallback for unknown/missing stages
          uCollege = college;
          uMajor = major;
        }

        let header = stage;
        if (years !== '-') {
          header = `${stage}:${years}`;
        }
        
        let content = college;
        if (major) {
          content = college ? `${college}-${major}` : major;
        }
        
        return `【${header}】${content}`.trim();
      });
      let formattedExp = expStrs.join('|');

      const values = [
        row.name, row.has_duplicate_name, row.hometown, formattedExp, row.degree,
        row.phone, row.interests, row.wechat_groups, row.dut_verified,
        row.birth_month, row.gender, row.region, row.career_type,
        row.company, row.position, row.industry, row.social_roles,
        bCollege, bMajor, mCollege, mMajor, dCollege, dMajor,
        uCollege, uMajor
      ].map(v => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      });
      csvRows.push(values.join(','));
    }

    const csv = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="alumni_export_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
