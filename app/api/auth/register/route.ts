import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generatePinyin, syncDuplicateStatus } from '@/lib/name-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginType, alumniId, phone, password, alumniData, wechat } = body;
    const db = getDb();

    if (loginType === 'link') {
      // Linking to an existing record
      const existingAlumni = db.prepare('SELECT * FROM alumni WHERE id = ?').get(alumniId) as any;
      if (!existingAlumni) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

      // Verify phone if it exists in system
      if (existingAlumni.phone && existingAlumni.phone !== phone) {
        return NextResponse.json({ error: '手机号验证失败，请重新输入或确认身份' }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user record
      db.prepare(`
        INSERT INTO users (alumni_id, password_hash, role, status)
        VALUES (?, ?, 'USER', 'PENDING')
      `).run(alumniId, passwordHash);

      // If phone was missing in system, update it
      if (!existingAlumni.phone && phone) {
        db.prepare('UPDATE alumni SET phone = ? WHERE id = ?').run(phone, alumniId);
      }

      // Update WeChat ID if provided
      if (wechat) {
        db.prepare('UPDATE alumni SET wechat_id = ? WHERE id = ?').run(wechat, alumniId);
      }

    } else if (loginType === 'new') {
      // New alumni registration
      const passwordHash = await bcrypt.hash(password, 10);
      
      const experiences = Array.isArray(alumniData.experiences) ? alumniData.experiences : [];
      const firstExp = experiences[0] || {};
      
      const p = {
        name: alumniData.name || null,
        gender: alumniData.gender || null,
        hometown: alumniData.hometown || null,
        birth_month: alumniData.birth_month || null,
        region: alumniData.region || null,
        // Mirror from first experience if scalar fields are missing
        enrollment_year: alumniData.enrollment_year || firstExp.start_year || null,
        graduation_year: alumniData.graduation_year || firstExp.end_year || null,
        college: alumniData.college || firstExp.college || null,
        college_normalized: alumniData.college_normalized || firstExp.college || null,
        major: alumniData.major || firstExp.major || null,
        degree: alumniData.degree || null,
        phone: (phone || alumniData.phone || '').toString().endsWith('.0') ? (phone || alumniData.phone || '').toString().slice(0, -2) : (phone || alumniData.phone || null),
        wechat_id: (alumniData.wechat_id || '').toString().endsWith('.0') ? alumniData.wechat_id.toString().slice(0, -2) : (alumniData.wechat_id || null),
        qq: (alumniData.qq || '').toString().endsWith('.0') ? alumniData.qq.toString().slice(0, -2) : (alumniData.qq || null),
        company: alumniData.company || null,
        position: alumniData.position || null,
        industry: alumniData.industry || null,
        career_type: alumniData.career_type || null,
        social_roles: alumniData.social_roles || null,
        business_desc: alumniData.business_desc || null,
        interests: alumniData.interests || null,
        status: 'PENDING',
        pinyin_name: generatePinyin(alumniData.name),
      };

      db.transaction(() => {
        const alumniResult = db.prepare(`
          INSERT INTO alumni (
            name, gender, hometown, birth_month, region,
            enrollment_year, graduation_year, college, college_normalized, major,
            degree, phone, wechat_id, qq, company, position, industry,
            career_type, social_roles, business_desc, interests, status, pinyin_name
          ) VALUES (
            @name, @gender, @hometown, @birth_month, @region,
            @enrollment_year, @graduation_year, @college, @college_normalized, @major,
            @degree, @phone, @wechat_id, @qq, @company, @position, @industry,
            @career_type, @social_roles, @business_desc, @interests, @status, @pinyin_name
          )
        `).run(p);

        const newAlumniId = alumniResult.lastInsertRowid;
        
        // Insert school experiences
        if (Array.isArray(alumniData.experiences)) {
          const insertExp = db.prepare(`
            INSERT INTO school_experiences (alumni_id, stage, start_year, end_year, college, major, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          alumniData.experiences.forEach((exp: any, i: number) => {
            insertExp.run(newAlumniId, exp.stage || null, exp.start_year || null, exp.end_year || null, exp.college || null, exp.major || null, i);
          });
        }

        db.prepare(`
          INSERT INTO users (alumni_id, password_hash, role, status)
          VALUES (?, ?, 'USER', 'PENDING')
        `).run(newAlumniId, passwordHash);

        if (p.name) syncDuplicateStatus(db, p.name);
      })();
    }

    return NextResponse.json({ success: true, message: '提交成功，请等待管理员审核' });
  } catch (error) {
    console.error('Registration error:', error);
    if (String(error).includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: '该校友已注册或已在审核中' }, { status: 400 });
    }
    return NextResponse.json({ error: '注册提交失败' }, { status: 500 });
  }
}
