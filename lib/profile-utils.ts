/**
 * Calculate the completion percentage of an alumni profile.
 * 20 key fields, each worth 5%.
 */
/**
 * Calculate the completion percentage of an alumni profile.
 * 20 key criteria/fields, each worth 5%.
 */
export function calculateProfileCompletion(alumni: any, experiences: any[] = []): number {
  if (!alumni) return 0;

  // 15 scalar fields (75%)
  const scalarFields = [
    'name', 'gender', 'hometown', 'birth_month', 'region', 
    'degree', 'phone', 'wechat_id', 'qq', 'career_type', 
    'company', 'position', 'industry', 'social_roles', 'business_desc', 'interests'
  ];

  let filledCount = 0;

  scalarFields.forEach(field => {
    const value = alumni[field];
    if (value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== '0') {
      filledCount++;
    }
  });

  // 4 education criteria (20%) - Checked against both mirrored fields and sub-experiences
  const firstExp = experiences && experiences[0];
  const hasStartYear = alumni.enrollment_year || (firstExp && firstExp.start_year);
  const hasEndYear = alumni.graduation_year || (firstExp && firstExp.end_year);
  const hasCollege = alumni.college_normalized || (firstExp && firstExp.college);
  const hasMajor = alumni.major || (firstExp && firstExp.major);

  if (hasStartYear) filledCount++;
  if (hasEndYear) filledCount++;
  if (hasCollege) filledCount++;
  if (hasMajor) filledCount++;

  // 1 criteria for presence of any experience description/list (5%)
  if ((experiences && experiences.length > 0) || (alumni.school_experience && alumni.school_experience.trim())) {
    filledCount++;
  }

  // Calculate percentage (max 100% based on 21 possible flags, but we normalize to 20 for simplicity)
  const percentage = Math.min(Math.round((filledCount / 20) * 100), 100);
  
  return percentage;
}

/**
 * Check if the profile meets the mandatory requirements for application.
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

  // Check School Experience (at least one segment with minimum data)
  const hasExp = (experiences && experiences.length > 0) || (alumni.college && alumni.enrollment_year);
  if (!hasExp) {
    return { eligible: false, reason: '在校经历未填写完整：至少需填写一段经历' };
  }

  const firstExp = experiences?.[0];
  const college = alumni.college || firstExp?.college;
  const startYear = alumni.enrollment_year || firstExp?.start_year;

  if (!college || !startYear) {
     return { eligible: false, reason: '在校经历未填写完整：需包含学院和起始年份' };
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
