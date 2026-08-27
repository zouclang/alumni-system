import { calculateProfileCompletion, COMPLETION_THRESHOLD, isProfileEligible } from './lib/profile-utils';

const testAlumni = {
  name: '测试员',
  gender: '男',
  hometown: '江苏苏州',
  birth_month: '5',
  region: '工业园区',
  phone: '13888888888',
  wechat_id: 'test_wechat',
  degree: '硕士',
  career_type: '',
  company: '',
  // ... other fields empty
};

const testExperiences = [
  { stage: '硕士', start_year: '2020', college: '计算机学院', major: '软件工程' }
];

console.log('--- Profile Completion Test (45% Rule) ---');
const completion = calculateProfileCompletion(testAlumni, testExperiences);
const eligibility = isProfileEligible(testAlumni, testExperiences);

console.log(`Completion: ${completion}%`);
console.log(`Threshold: ${COMPLETION_THRESHOLD}%`);
console.log(`Eligible: ${eligibility.eligible}`);
if (!eligibility.eligible) console.log(`Reason: ${eligibility.reason}`);

if (completion >= 45 && eligibility.eligible) {
  console.log('✅ TEST PASSED');
} else {
  console.log('❌ TEST FAILED');
}
