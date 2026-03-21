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

    // Build CSV matching the system form
    const headers = [
      '姓名', '性别', '家乡', '生日月份', '所在区域', 
      '联系电话', '微信号', '大工人认证', '最高学历', '所在微信群', 
      '在校经历', 
      '工作单位', '职位', '事业类型', '所属行业', '个人/公司主要业务', '社会职务', '兴趣爱好'
    ];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      // Get and format structured experiences matching the system's integrated format
      const experiences = expStmt.all(row.id) as any[];
      const expStrs = experiences.map(e => {
        const stage = e.stage || '';
        const years = `${e.start_year || ''}-${e.end_year || ''}`;
        const college = e.college || '';
        const major = e.major || '';
        
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
      const formattedExp = expStrs.join('|') || row.school_experience; // Fallback to raw if empty

      const values = [
        row.name, row.gender, row.hometown, row.birth_month, row.region,
        row.phone, row.wechat_id, row.dut_verified, row.degree, row.wechat_groups,
        formattedExp,
        row.company, row.position, row.career_type, row.industry, row.business_desc, row.social_roles, row.interests
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
