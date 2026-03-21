import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM alumni').get() as { count: number }).count;

    const byRegion = db.prepare(`
      SELECT region, COUNT(*) as count FROM alumni
      WHERE region IS NOT NULL AND region != ''
      GROUP BY region ORDER BY count DESC
    `).all();

    const byCollegeRows = db.prepare(`
      SELECT college, COUNT(*) as count FROM school_experiences
      WHERE college IS NOT NULL AND college != ''
      GROUP BY college ORDER BY count DESC LIMIT 15
    `).all() as any[];
    
    // Group duplicates if needed (we'll just use the raw query directly)
    const byCollege = byCollegeRows;

    const byDegree = db.prepare(`
      SELECT degree, COUNT(*) as count FROM alumni
      WHERE degree IS NOT NULL AND degree != ''
      GROUP BY degree ORDER BY count DESC
    `).all();

    const byGender = db.prepare(`
      SELECT gender, COUNT(*) as count FROM alumni
      WHERE gender IS NOT NULL AND gender != ''
      GROUP BY gender ORDER BY count DESC
    `).all();

    const byCareerType = db.prepare(`
      SELECT career_type, COUNT(*) as count FROM alumni
      WHERE career_type IS NOT NULL AND career_type != ''
      GROUP BY career_type ORDER BY count DESC
    `).all();

    const byEnrollmentYear = db.prepare(`
      SELECT enrollment_year as year, COUNT(*) as count FROM alumni
      WHERE enrollment_year IS NOT NULL 
        AND enrollment_year != '' 
        AND enrollment_year GLOB '[12][0-9][0-9][0-9]'
      GROUP BY enrollment_year ORDER BY enrollment_year ASC
    `).all();

    const byHometown = db.prepare(`
      SELECT hometown, COUNT(*) as count FROM alumni
      WHERE hometown IS NOT NULL AND hometown != ''
      GROUP BY hometown ORDER BY count DESC
    `).all();

    const byGraduationYear = db.prepare(`
      SELECT SUBSTR(graduation_year, 1, 4) as year, COUNT(*) as count FROM alumni
      WHERE graduation_year IS NOT NULL AND graduation_year != ''
      GROUP BY SUBSTR(graduation_year, 1, 4) ORDER BY year ASC
    `).all();

    const wechatGroupsRaw = db.prepare(`
      SELECT wechat_groups FROM alumni
      WHERE wechat_groups IS NOT NULL AND wechat_groups != ''
    `).all() as { wechat_groups: string }[];
    
    const groupCounts: Record<string, number> = {};
    wechatGroupsRaw.forEach(row => {
      const groups = row.wechat_groups.split(',').map(g => g.trim()).filter(Boolean);
      groups.forEach(g => {
        groupCounts[g] = (groupCounts[g] || 0) + 1;
      });
    });
    
    const byWechatGroup = Object.entries(groupCounts)
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalCount,
      byRegion,
      byCollege,
      byDegree,
      byGender,
      byCareerType,
      byEnrollmentYear,
      byHometown,
      byGraduationYear,
      byWechatGroup,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
