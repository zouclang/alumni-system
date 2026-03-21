/**
 * Calculate the completion percentage of an alumni profile.
 * 20 key fields, each worth 5%.
 */
export function calculateProfileCompletion(alumni: any, experiences: any[] = []): number {
  if (!alumni) return 0;

  const fields = [
    'name',
    'gender',
    'hometown',
    'birth_month',
    'region',
    'degree',
    'phone',
    'wechat_id',
    'qq',
    'career_type',
    'company',
    'position',
    'industry',
    'social_roles',
    'business_desc',
    'interests',
    // These 4 were in scalar but are now typically in experiences, 
    // keep for legacy/fallback counts
    'enrollment_year',
    'graduation_year',
    'college_normalized',
    'major',
  ];

  let filledCount = 0;

  // Check the 19 direct fields
  fields.forEach(field => {
    const value = alumni[field];
    if (value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== '0') {
      filledCount++;
    }
  });

  // Check for at least one school experience (20th "field")
  if (experiences && experiences.length > 0) {
    filledCount++;
  } else if (typeof alumni.school_experience === 'string' && alumni.school_experience.trim()) {
    filledCount++;
  }

  // Calculate percentage (max 100%)
  const percentage = Math.min(Math.round((filledCount / 20) * 100), 100);
  
  return percentage;
}

/**
 * Check if the profile meets the mandatory requirements for application.
 * Requirements: 
 * 1. Percentage >= 45%
 * 2. Basic Info complete: name, gender, hometown, birth_month, region, phone, wechat_id/qq, degree
 * 3. At least one complete school experience (stage, year, college, major)
 */
export function isProfileEligible(alumni: any, experiences: any[] = []): { eligible: boolean; reason?: string } {
  if (!alumni) return { eligible: false, reason: '未找到校友信息' };

  const completion = calculateProfileCompletion(alumni, experiences);
  if (completion < COMPLETION_THRESHOLD) {
    return { eligible: false, reason: `信息完整度不足 ${COMPLETION_THRESHOLD}%` };
  }

  // Check Basic Info
  const basicFields = [
    { key: 'name', label: '姓名' },
    { key: 'gender', label: '性别' },
    { key: 'hometown', label: '家乡' },
    { key: 'birth_month', label: '生日月份' },
    { key: 'region', label: '所在区域' },
    { key: 'phone', label: '联系电话' },
    { key: 'degree', label: '最高学历' }
  ];

  for (const f of basicFields) {
    const val = alumni[f.key];
    if (!val || String(val).trim() === '') {
      return { eligible: false, reason: `基本信息未填写完整：${f.label}` };
    }
  }

  // Check WeChat or QQ (at least one)
  if (!alumni.wechat_id && !alumni.qq) {
    return { eligible: false, reason: '基本信息未填写完整：微信号' };
  }

  // Check School Experience
  if (!experiences || experiences.length === 0) {
    return { eligible: false, reason: '在校经历未填写完整：至少需填写一段经历' };
  }

  const firstExp = experiences[0];
  const expFields = [
    { key: 'stage', label: '阶段' },
    { key: 'start_year', label: '起始年' },
    { key: 'college', label: '学院' },
    { key: 'major', label: '专业' }
  ];

  for (const f of expFields) {
    if (!firstExp[f.key] || String(firstExp[f.key]).trim() === '') {
      return { eligible: false, reason: `在校经历未填写完整：${f.label}` };
    }
  }

  // Check Work Info
  const careerType = alumni.career_type;
  const company = alumni.company;

  if (!careerType && !company) {
    return { eligible: false, reason: '工作信息填写不完整，无法获取对接权限' };
  }

  const topThreeTypes = ['职业经理（含高管、职员等）', '自主创业（有公司）', '其他（机关事业等）'];
  if (topThreeTypes.includes(careerType) && (!company || String(company).trim() === '')) {
    return { eligible: false, reason: '工作信息填写不完整，无法获取对接权限' };
  }

  return { eligible: true };
}

export const COMPLETION_THRESHOLD = 45;
