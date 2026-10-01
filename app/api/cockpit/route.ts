import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { computePotentialMatches } from '@/lib/matchmaking';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // 1. Overview counts
    const totalAlumni = (db.prepare("SELECT COUNT(*) as count FROM alumni WHERE status = 'APPROVED'").get() as { count: number }).count;
    const verifiedUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'APPROVED'").get() as { count: number }).count;

    // 2. Council
    const councilMembers = db.prepare(`
      SELECT id, name, association_role, college, company, position, region
      FROM alumni 
      WHERE association_role IS NOT NULL AND association_role != '' AND status = 'APPROVED'
      ORDER BY 
        CASE 
          WHEN association_role LIKE '%理事长%' AND association_role NOT LIKE '副%' THEN 1
          WHEN association_role LIKE '%副理事长%' THEN 2
          WHEN association_role LIKE '%秘书长%' AND association_role NOT LIKE '副%' THEN 3
          WHEN association_role LIKE '%副秘书长%' THEN 4
          WHEN association_role LIKE '%分会会长%' THEN 5
          ELSE 6
        END, id ASC
    `).all() as any[];

    const councilRoleMap: Record<string, number> = {};
    councilMembers.forEach(m => {
      const roles = (m.association_role || '').split(',').map((r: string) => r.trim()).filter(Boolean);
      roles.forEach((r: string) => {
        let clean = r;
        if (clean.includes('常务副理事长')) clean = '常务副理事长';
        else if (clean.includes('副理事长')) clean = '副理事长';
        else if (clean.includes('理事长')) clean = '理事长';
        else if (clean.includes('副秘书长')) clean = '副秘书长';
        else if (clean.includes('秘书长')) clean = '秘书长';
        else if (clean.includes('分会会长')) clean = '分会会长';
        else if (clean.includes('分会秘书长')) clean = '分会秘书长';
        else if (clean.includes('理事')) clean = '理事';
        councilRoleMap[clean] = (councilRoleMap[clean] || 0) + 1;
      });
    });
    const councilByRole = Object.entries(councilRoleMap)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Jobs & Recruitment
    let totalJobs = 0;
    let activeJobs = 0;
    let jobCompanies = 0;
    let totalApplications = 0;
    let recentJobs: any[] = [];
    let jobsBySalary: { range: string; count: number }[] = [];
    let jobsByType: { type: string; count: number }[] = [];

    try {
      totalJobs = (db.prepare("SELECT COUNT(*) as count FROM job_postings").get() as any)?.count || 0;
      activeJobs = (db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE status = 'ACTIVE'").get() as any)?.count || 0;
      jobCompanies = (db.prepare("SELECT COUNT(DISTINCT company_name) as count FROM job_postings").get() as any)?.count || 0;
      totalApplications = (db.prepare("SELECT COUNT(*) as count FROM job_applications").get() as any)?.count || 0;

      recentJobs = db.prepare(`
        SELECT id, job_title, company_name, location, salary_range, job_type, created_at, status
        FROM job_postings
        ORDER BY created_at DESC LIMIT 6
      `).all() as any[];

      const salaryRows = db.prepare(`
        SELECT salary_range, COUNT(*) as count FROM job_postings
        WHERE salary_range IS NOT NULL AND salary_range != ''
        GROUP BY salary_range ORDER BY count DESC
      `).all() as any[];
      jobsBySalary = salaryRows.map(r => ({ range: r.salary_range, count: r.count }));

      const typeRows = db.prepare(`
        SELECT job_type, COUNT(*) as count FROM job_postings
        WHERE job_type IS NOT NULL AND job_type != ''
        GROUP BY job_type ORDER BY count DESC
      `).all() as any[];
      jobsByType = typeRows.map(r => ({ type: r.job_type, count: r.count }));
    } catch (e) {
      console.warn('Jobs query error in cockpit:', e);
    }

    // 4. Matchmaking & Dating
    let activeProfiles = 0;
    let mmMales = 0;
    let mmFemales = 0;
    let mutualMatchCount = 0;
    let oneWayMatchCount = 0;
    let connectionStats = { total: 0, approved: 0, pending: 0, rejected: 0, withdrawn: 0 };
    let mmByAgeGroup: { group: string; count: number }[] = [];
    let mmByDegree: { degree: string; count: number }[] = [];

    try {
      const activeMembers = db.prepare(`
        SELECT mp.*, ma.status as app_status, a.enrollment_year, a.graduation_year, a.degree as alumni_degree
        FROM matchmaking_profiles mp
        JOIN matchmaking_applications ma ON ma.alumni_id = mp.alumni_id
        LEFT JOIN alumni a ON a.id = mp.alumni_id
        WHERE ma.status = 'APPROVED' AND mp.is_active = 1
      `).all() as any[];

      activeProfiles = activeMembers.length;
      mmMales = activeMembers.filter(m => m.gender === 'M').length;
      mmFemales = activeMembers.filter(m => m.gender === 'F').length;

      // Age distribution (16位已完善资料按填写真实年龄分布，7位待完善相亲资料的校友单独归入待完善)
      const ageGroups: Record<string, number> = { '00后': 0, '95-99年': 0, '90-94年': 0, '85-89年': 0, '80-84年': 0, '待完善': 0 };
      const currentYear = new Date().getFullYear();
      activeMembers.forEach(m => {
        if (!m.age) {
          ageGroups['待完善']++;
          return;
        }
        const birthYear = currentYear - Number(m.age);
        if (birthYear >= 2000) ageGroups['00后']++;
        else if (birthYear >= 1995) ageGroups['95-99年']++;
        else if (birthYear >= 1990) ageGroups['90-94年']++;
        else if (birthYear >= 1985) ageGroups['85-89年']++;
        else if (birthYear >= 1980) ageGroups['80-84年']++;
        else ageGroups['待完善']++;
      });
      mmByAgeGroup = Object.entries(ageGroups).map(([group, count]) => ({ group, count }));

      // Degree in matchmaking (优先相亲资料填报学历，未填报时兼容校友录本底真实学历)
      const degreeMap: Record<string, number> = {};
      activeMembers.forEach(m => {
        const deg = (m.degree || m.alumni_degree || '其他').trim();
        degreeMap[deg] = (degreeMap[deg] || 0) + 1;
      });
      mmByDegree = Object.entries(degreeMap).map(([degree, count]) => ({ degree, count }));

      // Use the standard system matching engine to match "喜结连理·管理控制台" exactly
      const potentialMatches = computePotentialMatches(db);
      mutualMatchCount = potentialMatches.totalMutualPairs;
      oneWayMatchCount = potentialMatches.totalOneWayPairs;

      // Connection stats
      const conns = db.prepare('SELECT status, count(*) as count FROM matchmaking_connections GROUP BY status').all() as any[];
      conns.forEach(c => {
        connectionStats.total += c.count;
        if (c.status === 'PENDING') connectionStats.pending = c.count;
        if (c.status === 'REJECTED') connectionStats.rejected = c.count;
        if (c.status === 'WITHDRAWN') connectionStats.withdrawn = c.count;
      });
      // Match admin console: approved connections count
      connectionStats.approved = potentialMatches.totalApprovedConnections;
    } catch (e) {
      console.warn('Matchmaking query error in cockpit:', e);
    }

    // 5. Macroscopic Stats (Matching User Screenshot)
    const byRegion = db.prepare(`
      SELECT region, COUNT(*) as count FROM alumni
      WHERE region IS NOT NULL AND region != '' AND status = 'APPROVED'
      GROUP BY region ORDER BY count DESC
    `).all() as { region: string; count: number }[];

    const byCollege = db.prepare(`
      SELECT se.college, COUNT(*) as count FROM school_experiences se
      JOIN alumni a ON a.id = se.alumni_id
      WHERE se.college IS NOT NULL AND se.college != '' AND a.status = 'APPROVED'
      GROUP BY se.college ORDER BY count DESC LIMIT 10
    `).all() as { college: string; count: number }[];

    const collegeCountRow = db.prepare(`
      SELECT COUNT(DISTINCT se.college) as count FROM school_experiences se
      JOIN alumni a ON a.id = se.alumni_id
      WHERE se.college IS NOT NULL AND se.college != '' AND a.status = 'APPROVED'
    `).get() as { count: number } | undefined;
    const collegeCount = collegeCountRow?.count || byCollege.length;

    const byDegree = db.prepare(`
      SELECT degree, COUNT(*) as count FROM alumni
      WHERE degree IS NOT NULL AND degree != '' AND status = 'APPROVED'
      GROUP BY degree ORDER BY count DESC
    `).all() as { degree: string; count: number }[];

    const byGender = db.prepare(`
      SELECT 
        CASE 
          WHEN gender IN ('男', 'M') THEN '男'
          WHEN gender IN ('女', 'F') THEN '女'
          ELSE gender
        END as gender,
        COUNT(*) as count
      FROM alumni
      WHERE gender IS NOT NULL AND gender != '' AND status = 'APPROVED'
      GROUP BY 
        CASE 
          WHEN gender IN ('男', 'M') THEN '男'
          WHEN gender IN ('女', 'F') THEN '女'
          ELSE gender
        END
      ORDER BY count DESC
    `).all() as { gender: string; count: number }[];

    const byCareerType = db.prepare(`
      SELECT career_type, COUNT(*) as count FROM alumni
      WHERE career_type IS NOT NULL AND career_type != '' AND status = 'APPROVED'
      GROUP BY career_type ORDER BY count DESC
    `).all() as { career_type: string; count: number }[];

    const byHometown = db.prepare(`
      SELECT hometown, COUNT(*) as count FROM alumni
      WHERE hometown IS NOT NULL AND hometown != '' AND status = 'APPROVED'
      GROUP BY hometown ORDER BY count DESC
    `).all() as { hometown: string; count: number }[];

    const byIndustry = db.prepare(`
      SELECT industry, COUNT(*) as count FROM alumni
      WHERE industry IS NOT NULL AND industry != '' AND status = 'APPROVED'
      GROUP BY industry ORDER BY count DESC LIMIT 12
    `).all() as { industry: string; count: number }[];

    // WeChat Groups breakdown
    const wechatGroupsRaw = db.prepare(`
      SELECT wechat_groups FROM alumni
      WHERE wechat_groups IS NOT NULL AND wechat_groups != '' AND status = 'APPROVED'
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

    // Enterprise & Industry Analysis (Entire Alumni Network)
    const topEnterprisesRaw = db.prepare(`
      SELECT company, COUNT(*) as count 
      FROM alumni 
      WHERE company IS NOT NULL AND company != '' AND status = 'APPROVED'
        AND company NOT IN ('无', '退休', '暂无', '待业')
        AND company NOT LIKE '%退休%'
      GROUP BY company 
      HAVING count >= 5
      ORDER BY count DESC
    `).all() as { company: string; count: number }[];

    const enterpriseAlumniCount = (db.prepare(`
      SELECT COUNT(*) as count FROM alumni 
      WHERE company IS NOT NULL AND company != '' AND status = 'APPROVED'
        AND company NOT IN ('无', '退休', '暂无', '待业')
        AND company NOT LIKE '%退休%'
    `).get() as any)?.count || 0;

    const enterpriseCompanyCount = (db.prepare(`
      SELECT COUNT(DISTINCT company) as count FROM alumni 
      WHERE company IS NOT NULL AND company != '' AND status = 'APPROVED'
        AND company NOT IN ('无', '退休', '暂无', '待业')
        AND company NOT LIKE '%退休%'
    `).get() as any)?.count || 0;

    // Categorize alumni into industry clusters
    const allCompanyRows = db.prepare(`
      SELECT company, industry FROM alumni 
      WHERE company IS NOT NULL AND company != '' AND status = 'APPROVED'
        AND company NOT IN ('无', '退休', '暂无', '待业')
        AND company NOT LIKE '%退休%'
    `).all() as { company: string; industry: string }[];

    const clusterMap: Record<string, { count: number; icon: string; color: string; desc: string }> = {
      '高端装备制造': { count: 0, icon: '⚙️', color: '#38bdf8', desc: '工业母机/机器人/汽车精密' },
      '新一代信息技术': { count: 0, icon: '💻', color: '#818cf8', desc: '芯片/工业软件/算法与网络' },
      '新材料与化工': { count: 0, icon: '🧬', color: '#c084fc', desc: '光电缆/高端氟化工/新材料' },
      '新能源与低碳': { count: 0, icon: '⚡', color: '#34d399', desc: '光伏/储能/热工院/智能电网' },
      '现代金融服务': { count: 0, icon: '🏦', color: '#f472b6', desc: '银行/券商/创投/规划设计' },
    };

    allCompanyRows.forEach(row => {
      const text = ((row.company || '') + ' ' + (row.industry || '')).toLowerCase();
      if (['大学', '学院', '学校', '研究所', '纳米所', '中科院', '审协', '知识产权'].some(k => text.includes(k))) {
        // 高校院所等教育科研单位不作为企业产业集群展示
        return;
      } else if (['热工院', '清洁', '能源', '电池', '光伏', '环保', '水务', '电力', '供电', '核电', '清陶'].some(k => text.includes(k))) {
        clusterMap['新能源与低碳'].count++;
      } else if (['银行', '证券', '投资', '基金', '保险', '创投', '财务', '苏高新'].some(k => text.includes(k))) {
        clusterMap['现代金融服务'].count++;
      } else if (['软件', '华为', '微软', '微电子', '芯片', '半导体', '同程', '网络', 'ai', '人工智能', '信息技术'].some(k => text.includes(k))) {
        clusterMap['新一代信息技术'].count++;
      } else if (['化工', '材料', '纳米', '光电', '海缆', '亨通', '大金', '氟', '医药', '生物'].some(k => text.includes(k))) {
        clusterMap['新材料与化工'].count++;
      } else if (['汇川', '博世', '汽车', '制造', '三一', '耐世特', '机械', '重工', '自动化', '装备', '电气', '维信', '东山', '中衡'].some(k => text.includes(k))) {
        clusterMap['高端装备制造'].count++;
      }
    });

    const totalIdentified = Object.values(clusterMap).reduce((sum, item) => sum + item.count, 0) || 1;
    const industryClusters = Object.entries(clusterMap)
      .map(([name, val]) => ({
        name,
        icon: val.icon,
        color: val.color,
        desc: val.desc,
        count: val.count,
        percent: Math.round((val.count / totalIdentified) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      overview: {
        totalAlumni,
        verifiedUsers,
        councilCount: councilMembers.length,
        jobCount: totalJobs,
        activeJobCount: activeJobs,
        jobCompanies,
        totalApplications,
        singleCount: activeProfiles,
        mutualMatchCount,
        oneWayMatchCount,
        connectionCount: connectionStats.total,
        approvedConnections: connectionStats.approved,
        wechatGroupCount: byWechatGroup.length,
        collegeCount,
      },
      enterprises: {
        totalAlumniWithCompany: enterpriseAlumniCount,
        totalCompanies: enterpriseCompanyCount,
        topCompaniesWith5Plus: topEnterprisesRaw,
        industryClusters,
      },
      council: {
        total: councilMembers.length,
        byRole: councilByRole,
        members: councilMembers,
      },
      jobs: {
        totalPostings: totalJobs,
        activePostings: activeJobs,
        totalCompanies: jobCompanies,
        totalApplications,
        bySalary: jobsBySalary,
        byType: jobsByType,
        recentJobs,
      },
      matchmaking: {
        totalActive: activeProfiles,
        males: mmMales,
        females: mmFemales,
        mutualMatches: mutualMatchCount,
        oneWayMatches: oneWayMatchCount,
        connections: connectionStats,
        byAgeGroup: mmByAgeGroup,
        byDegree: mmByDegree,
      },
      macro: {
        byHometown,
        byRegion,
        byCollege,
        byDegree,
        byGender,
        byCareerType,
        byWechatGroup,
        byIndustry,
      },
    });
  } catch (error) {
    console.error('GET /api/cockpit error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
