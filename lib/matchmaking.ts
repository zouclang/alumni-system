export function parseJ(v: any): string[] {
  if (!v) return [];
  try {
    const r = JSON.parse(v);
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

export function maskName(name: string): string {
  if (!name) return '**';
  if (name.length === 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}

export function inRange(val: number | null, min: number | null, max: number | null): boolean {
  if (val === null) return true;
  if (min !== null && val < min) return false;
  if (max !== null && val > max) return false;
  return true;
}

const ALIAS_MAP: Record<string, string[]> = {
  '国企': ['国企', '央国企'],
  '央国企': ['国企', '央国企'],
  '大厂': ['大厂', '上市公司/科技大厂/大型民企'],
  '上市公司/科技大厂/大型民企': ['大厂', '上市公司/科技大厂/大型民企'],
  '大型民企': ['大型民企', '上市公司/科技大厂/大型民企', '普通民企', '民营企业'],
  '普通民企': ['普通民企', '民营企业'],
  '民营企业': ['普通民企', '民营企业']
};

export function arrAccepts(myVal: string | null, theirArr: string[]): boolean {
  if (!theirArr || theirArr.length === 0) return true;
  if (!myVal) return true;
  if (theirArr.includes(myVal)) return true;
  const aliases = ALIAS_MAP[myVal] || [myVal];
  return aliases.some(a => theirArr.includes(a));
}

export function arrIntersects(myArr: string[], theirArr: string[]): boolean {
  if (!theirArr || theirArr.length === 0) return true;
  if (!myArr || myArr.length === 0) return true;
  return myArr.some(v => theirArr.includes(v));
}

export function smokeAccepts(myVal: string | null, theirPref: string | null): boolean {
  if (!theirPref || theirPref === '不限') return true;
  if (!myVal) return true;
  if (theirPref === '不吸烟') return myVal === '不吸烟';
  if (theirPref === '可接受偶尔') return myVal === '不吸烟' || myVal === '偶尔';
  return true;
}

export function drinkAccepts(myVal: string | null, theirPref: string | null): boolean {
  if (!theirPref || theirPref === '不限') return true;
  if (!myVal) return true;
  if (theirPref === '不喝酒') return myVal === '不喝酒';
  if (theirPref === '可接受偶尔') return myVal === '不喝酒' || myVal === '偶尔小酌';
  return true;
}

export function scheduleAccepts(myVal: string | null, theirPref: string | null): boolean {
  if (!theirPref || theirPref === '不限') return true;
  if (!myVal) return true;
  if (theirPref === '规律') return myVal === '规律（早睡早起）';
  if (theirPref === '基本规律即可') return myVal === '规律（早睡早起）' || myVal === '基本规律';
  return true;
}

export function degreeRank(d: string | null): number {
  const map: Record<string, number> = { '大专': 1, '本科': 2, '硕士': 3, '博士': 4 };
  return d ? (map[d] || 0) : 0;
}

export interface MatchScoreDetail {
  passed: boolean;
  label: string;
}

export interface MatchScoreResult {
  score: number; // 0 to 100
  passedCount: number;
  totalCount: number; // 14
  hardConstraintPassed: boolean; // marital status and age
  maritalPassed: boolean;
  agePassed: boolean;
  isEligible: boolean; // hardConstraintPassed && (passedCount >= requiredCount || score >= threshold)
  threshold: number;
  details: Record<string, MatchScoreDetail>;
}

export function getRequiredPassedCount(threshold: number, total: number = 14): number {
  if (threshold >= 100) return 14;
  if (threshold >= 90) return 13;
  if (threshold >= 85) return 12;
  if (threshold >= 80) return 11;
  if (threshold >= 70) return 10;
  return Math.ceil((threshold / 100) * total);
}

// Evaluate how well myProfile satisfies theirCriteria
export function evaluateMatchScore(myProfile: any, theirCriteria: any): MatchScoreResult {
  if (!myProfile || !theirCriteria) {
    return {
      score: 100,
      passedCount: 14,
      totalCount: 14,
      hardConstraintPassed: true,
      maritalPassed: true,
      agePassed: true,
      isEligible: true,
      threshold: 80,
      details: {},
    };
  }

  const threshold = (theirCriteria.match_threshold !== undefined && theirCriteria.match_threshold !== null)
    ? Number(theirCriteria.match_threshold)
    : 80;

  // 1. Hard constraints: Marital status + Age (一票否决)
  const maritalCriteria = parseJ(theirCriteria.marital_status);
  const maritalPassed = arrAccepts(myProfile.marital_status, maritalCriteria);
  const agePassed = inRange(myProfile.age, theirCriteria.age_min, theirCriteria.age_max);
  const hardConstraintPassed = maritalPassed && agePassed;

  // 2. 14 Quantitative items
  const details: Record<string, MatchScoreDetail> = {
    height: {
      passed: inRange(myProfile.height, theirCriteria.height_min, theirCriteria.height_max),
      label: '身高',
    },
    weight: {
      passed: inRange(myProfile.weight, theirCriteria.weight_min, theirCriteria.weight_max),
      label: '体重',
    },
    annual_income: {
      passed: inRange(myProfile.annual_income, theirCriteria.income_min, theirCriteria.income_max),
      label: '税后年收入',
    },
    property_status: {
      passed: arrAccepts(myProfile.property_status, parseJ(theirCriteria.property_status)),
      label: '房产状况',
    },
    job_type: {
      passed: arrAccepts(myProfile.job_type, parseJ(theirCriteria.job_type)),
      label: '职业性质',
    },
    degree: {
      passed: !theirCriteria.degree || degreeRank(myProfile.degree) >= degreeRank(theirCriteria.degree),
      label: '最高学历',
    },
    parents_insurance: {
      passed: !theirCriteria.parents_insurance || theirCriteria.parents_insurance === '不限' || !myProfile.parents_insurance || myProfile.parents_insurance === theirCriteria.parents_insurance,
      label: '父母医社保',
    },
    family_structure: {
      passed: !theirCriteria.family_structure || theirCriteria.family_structure === '不限' || !myProfile.family_structure || myProfile.family_structure === theirCriteria.family_structure,
      label: '原生家庭',
    },
    parents_marital: {
      passed: !theirCriteria.parents_marital || theirCriteria.parents_marital === '不限' || !myProfile.parents_marital || myProfile.parents_marital === theirCriteria.parents_marital,
      label: '父母婚姻',
    },
    smoking: {
      passed: smokeAccepts(myProfile.smoking, theirCriteria.smoking),
      label: '吸烟习惯',
    },
    drinking: {
      passed: drinkAccepts(myProfile.drinking, theirCriteria.drinking),
      label: '饮酒习惯',
    },
    schedule: {
      passed: scheduleAccepts(myProfile.schedule, theirCriteria.schedule),
      label: '作息规律',
    },
    hobbies: {
      passed: arrIntersects(parseJ(myProfile.hobbies), parseJ(theirCriteria.hobbies)),
      label: '个人爱好',
    },
    personality: {
      passed: arrIntersects(parseJ(myProfile.personality), parseJ(theirCriteria.personality)),
      label: '性格特质',
    },
  };

  const totalCount = 14;
  let passedCount = 0;
  for (const key in details) {
    if (details[key].passed) passedCount++;
  }

  const score = Math.round((passedCount / totalCount) * 100);
  const requiredCount = getRequiredPassedCount(threshold, totalCount);
  const isEligible = hardConstraintPassed && (passedCount >= requiredCount || score >= threshold);

  return {
    score,
    passedCount,
    totalCount,
    hardConstraintPassed,
    maritalPassed,
    agePassed,
    isEligible,
    threshold,
    details,
  };
}

// Does myProfile satisfy theirCriteria?
export function meetsTheirCriteria(myProfile: any, theirCriteria: any): boolean {
  if (!theirCriteria) return true;
  return evaluateMatchScore(myProfile, theirCriteria).isEligible;
}

/**
 * Computes all mutual and one-way matches among approved active members in the system,
 * along with their current connection status.
 */
export function computePotentialMatches(db: any) {
  // Query all active male and female profiles that completed profiles
  const males = db.prepare(`
    SELECT mp.*, a.name as alumni_name, a.phone, a.wechat_id, a.college, a.major, a.enrollment_year
    FROM matchmaking_profiles mp
    JOIN alumni a ON a.id = mp.alumni_id
    JOIN matchmaking_applications ma ON ma.alumni_id = mp.alumni_id
    WHERE ma.status = 'APPROVED' AND mp.is_active = 1 AND mp.profile_completed = 1 AND (mp.gender = 'M' OR mp.gender = '男')
  `).all() as any[];

  const females = db.prepare(`
    SELECT mp.*, a.name as alumni_name, a.phone, a.wechat_id, a.college, a.major, a.enrollment_year
    FROM matchmaking_profiles mp
    JOIN alumni a ON a.id = mp.alumni_id
    JOIN matchmaking_applications ma ON ma.alumni_id = mp.alumni_id
    WHERE ma.status = 'APPROVED' AND mp.is_active = 1 AND mp.profile_completed = 1 AND (mp.gender = 'F' OR mp.gender = '女')
  `).all() as any[];

  // Load criteria for all
  const criteriaMap = new Map<number, any>();
  const allCriteria = db.prepare('SELECT * FROM matchmaking_criteria').all() as any[];
  for (const c of allCriteria) {
    criteriaMap.set(c.alumni_id, c);
  }

  // Load existing connections with requester & target names
  const connections = db.prepare(`
    SELECT 
      mc.id, mc.applicant_alumni_id, mc.target_alumni_id, mc.status, mc.reject_reason, mc.created_at,
      app.name as applicant_name,
      tgt.name as target_name
    FROM matchmaking_connections mc
    JOIN alumni app ON app.id = mc.applicant_alumni_id
    JOIN alumni tgt ON tgt.id = mc.target_alumni_id
    ORDER BY mc.created_at DESC
  `).all() as any[];

  const findConnection = (id1: number, id2: number) => {
    const list = connections.filter(
      (c: any) =>
        (c.applicant_alumni_id === id1 && c.target_alumni_id === id2) ||
        (c.applicant_alumni_id === id2 && c.target_alumni_id === id1)
    );
    if (list.length === 0) return { status: 'NONE' };
    const approved = list.find((c: any) => c.status === 'APPROVED');
    if (approved) return { ...approved, status: 'APPROVED' };
    const pending = list.find((c: any) => c.status === 'PENDING');
    if (pending) return { ...pending, status: 'PENDING' };
    const rejected = list.find((c: any) => c.status === 'REJECTED');
    if (rejected) return { ...rejected, status: 'REJECTED' };
    return list[0];
  };

  const mutualPairs: any[] = [];
  const oneWayPairs: any[] = [];
  const memberMutualCountMap = new Map<number, number>();

  for (const male of males) {
    const maleCrit = criteriaMap.get(male.alumni_id);
    for (const female of females) {
      const femaleCrit = criteriaMap.get(female.alumni_id);
      const maleScore = evaluateMatchScore(male, femaleCrit);
      const femaleScore = evaluateMatchScore(female, maleCrit);
      const maleMeetsFemale = maleScore.isEligible;
      const femaleMeetsMale = femaleScore.isEligible;

      const conn = findConnection(male.alumni_id, female.alumni_id);

      const maleInfo = {
        alumni_id: male.alumni_id,
        name: male.alumni_name,
        gender: 'M',
        age: male.age,
        height: male.height,
        weight: male.weight,
        job_type: male.job_type,
        degree: male.degree,
        college: male.college,
        major: male.major,
        annual_income: male.annual_income,
        property_status: male.property_status,
      };

      const femaleInfo = {
        alumni_id: female.alumni_id,
        name: female.alumni_name,
        gender: 'F',
        age: female.age,
        height: female.height,
        weight: female.weight,
        job_type: female.job_type,
        degree: female.degree,
        college: female.college,
        major: female.major,
        annual_income: female.annual_income,
        property_status: female.property_status,
      };

      if (maleMeetsFemale && femaleMeetsMale) {
        // 双向互相满足：自动算对接成功并解锁联系方式
        mutualPairs.push({
          male: maleInfo,
          female: femaleInfo,
          connection: conn,
          isConnected: true,
          isPending: conn.status === 'PENDING',
          isRejected: conn.status === 'REJECTED',
          maleScore: maleScore.score,
          femaleScore: femaleScore.score,
          avgScore: Math.round((maleScore.score + femaleScore.score) / 2),
        });
        memberMutualCountMap.set(male.alumni_id, (memberMutualCountMap.get(male.alumni_id) || 0) + 1);
        memberMutualCountMap.set(female.alumni_id, (memberMutualCountMap.get(female.alumni_id) || 0) + 1);
      } else if (femaleMeetsMale && !maleMeetsFemale) {
        // 女方单方面满足男方择偶条件 (如：王菲 ➔ 范永升)
        oneWayPairs.push({
          from: femaleInfo,
          to: maleInfo,
          direction: 'FEMALE_TO_MALE',
          summary: `${femaleInfo.name} 满足 ${maleInfo.name} 择偶要求 (${femaleScore.score}%)`,
          connection: conn,
          isConnected: conn.status === 'APPROVED',
          isPending: conn.status === 'PENDING',
          isRejected: conn.status === 'REJECTED',
          score: femaleScore.score,
          otherScore: maleScore.score,
        });
      } else if (maleMeetsFemale && !femaleMeetsMale) {
        // 男方单方面满足女方择偶条件 (如：男方 ➔ 女方)
        oneWayPairs.push({
          from: maleInfo,
          to: femaleInfo,
          direction: 'MALE_TO_FEMALE',
          summary: `${maleInfo.name} 满足 ${femaleInfo.name} 择偶要求 (${maleScore.score}%)`,
          connection: conn,
          isConnected: conn.status === 'APPROVED',
          isPending: conn.status === 'PENDING',
          isRejected: conn.status === 'REJECTED',
          score: maleScore.score,
          otherScore: femaleScore.score,
        });
      }
    }
  }

  mutualPairs.sort((a, b) => b.avgScore - a.avgScore);
  oneWayPairs.sort((a, b) => b.score - a.score);

  const oneWayApprovedCount = oneWayPairs.filter((p: any) => p.isConnected).length;
  const totalApprovedConnections = mutualPairs.length + oneWayApprovedCount;

  return {
    totalMutualPairs: mutualPairs.length,
    mutualPairs,
    totalOneWayPairs: oneWayPairs.length,
    oneWayPairs,
    totalApprovedConnections,
    memberMutualCountMap,
  };
}

export const computePotentialMutualMatches = computePotentialMatches;
