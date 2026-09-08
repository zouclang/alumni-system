'use client';

import { useEffect, useState } from 'react';

interface MatchmakingDetailModalProps {
  alumniId: number;
  onClose: () => void;
  onOpenEditAlumni?: (alumni: any) => void;
}

export default function MatchmakingDetailModal({ alumniId, onClose, onOpenEditAlumni }: MatchmakingDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'matchmaking' | 'basic'>('matchmaking');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/matchmaking?alumni_id=${alumniId}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [alumniId]);

  const parseJ = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try {
      const r = JSON.parse(v);
      return Array.isArray(r) ? r : [];
    } catch {
      return [];
    }
  };

  const formatRange = (min: any, max: any, unit: string) => {
    if (!min && !max) return '不限';
    if (min && max) return `${min} ~ ${max} ${unit}`;
    if (min) return `≥ ${min} ${unit}`;
    return `≤ ${max} ${unit}`;
  };

  const formatArray = (arr: any) => {
    const list = parseJ(arr);
    if (list.length === 0) return '不限';
    return list.join('、');
  };

  const alumni = data?.alumni || {};
  const profile = data?.profile || {};
  const criteria = data?.criteria || {};
  const hasMmProfile = !!data?.profile;

  const comparisonRows: { label: string; self: any; partner: any }[] = [
    {
      label: '周岁年龄',
      self: profile.age ? `${profile.age} 岁` : '未填写',
      partner: formatRange(criteria.age_min, criteria.age_max, '岁'),
    },
    {
      label: '身高',
      self: profile.height ? `${profile.height} cm` : '未填写',
      partner: formatRange(criteria.height_min, criteria.height_max, 'cm'),
    },
    {
      label: '体重',
      self: profile.weight ? `${profile.weight} kg` : '未填写',
      partner: formatRange(criteria.weight_min, criteria.weight_max, 'kg'),
    },
    {
      label: '籍贯',
      self: profile.hometown || alumni.hometown || '未填写',
      partner: '—',
    },
    {
      label: '婚姻状况',
      self: profile.marital_status || '未填写',
      partner: formatArray(criteria.marital_status),
    },
    {
      label: '居住区域',
      self: profile.region || alumni.region || '未填写',
      partner: formatArray(criteria.region),
    },
    {
      label: '房产状况',
      self: profile.property_status || '未填写',
      partner: formatArray(criteria.property_status),
    },
    {
      label: '税后年收入',
      self: profile.annual_income ? `${profile.annual_income} 万元` : '未填写',
      partner: formatRange(criteria.income_min, criteria.income_max, '万元'),
    },
    {
      label: '职业性质',
      self: profile.job_type || '未填写',
      partner: formatArray(criteria.job_type),
    },
    {
      label: '最高学历',
      self: profile.degree || alumni.degree || '未填写',
      partner: criteria.degree ? `${criteria.degree} 及以上` : '不限',
    },
    {
      label: '父母工作',
      self: formatArray(profile.parents_job),
      partner: formatArray(criteria.parents_job),
    },
    {
      label: '父母医保社保',
      self: profile.parents_insurance || '未填写',
      partner: criteria.parents_insurance || '不限',
    },
    {
      label: '原生家庭结构',
      self: profile.family_structure || '未填写',
      partner: criteria.family_structure || '不限',
    },
    {
      label: '父母婚姻状况',
      self: profile.parents_marital || '未填写',
      partner: criteria.parents_marital || '不限',
    },
    {
      label: '吸烟习惯',
      self: profile.smoking || '未填写',
      partner: criteria.smoking || '不限',
    },
    {
      label: '饮酒习惯',
      self: profile.drinking || '未填写',
      partner: criteria.drinking || '不限',
    },
    {
      label: '作息习惯',
      self: profile.schedule || '未填写',
      partner: criteria.schedule || '不限',
    },
    {
      label: '个人爱好',
      self: formatArray(profile.hobbies),
      partner: formatArray(criteria.hobbies),
    },
    {
      label: '性格特质',
      self: formatArray(profile.personality),
      partner: formatArray(criteria.personality),
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        width: '100%',
        maxWidth: 880,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        color: '#f8fafc',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                {alumni.name || '校友资料'}
              </h2>
              {alumni.gender && (
                <span style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                  background: alumni.gender === 'F' ? 'rgba(244, 114, 182, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                  color: alumni.gender === 'F' ? '#f472b6' : '#60a5fa',
                }}>
                  {alumni.gender === 'F' ? '女' : '男'}
                </span>
              )}
              {hasMmProfile && (
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                  background: profile.profile_completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: profile.profile_completed ? '#34d399' : '#fbbf24',
                  border: '1px solid ' + (profile.profile_completed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'),
                }}>
                  {profile.profile_completed ? '✅ 择偶条件已完善' : '⚠️ 尚未完善条件'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>🎓 {alumni.college || '—'} · {alumni.enrollment_year ? `${alumni.enrollment_year}级` : '—'}</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>💬 微信: {alumni.wechat_id || '未填写'}</span>
              {alumni.phone && <span style={{ color: '#93c5fd' }}>📱 手机: {alumni.phone}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '0 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.15)',
        }}>
          <button
            onClick={() => setActiveTab('matchmaking')}
            style={{
              padding: '12px 6px',
              background: 'none',
              border: 'none',
              fontSize: 14,
              fontWeight: activeTab === 'matchmaking' ? 700 : 500,
              color: activeTab === 'matchmaking' ? '#f472b6' : '#94a3b8',
              borderBottom: activeTab === 'matchmaking' ? '2px solid #f472b6' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            💞 喜结连理档案（条件与择偶标准）
          </button>
          <button
            onClick={() => setActiveTab('basic')}
            style={{
              padding: '12px 6px',
              background: 'none',
              border: 'none',
              fontSize: 14,
              fontWeight: activeTab === 'basic' ? 700 : 500,
              color: activeTab === 'basic' ? '#60a5fa' : '#94a3b8',
              borderBottom: activeTab === 'basic' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            📋 校友基础资料（通讯录信息）
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              正在加载校友完整档案…
            </div>
          ) : activeTab === 'matchmaking' ? (
            <div>
              {/* Readonly Notice Banner */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 12,
                padding: '10px 16px',
                fontSize: 12.5,
                color: '#93c5fd',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>🔒</span>
                <span><strong>管理员只读模式</strong>：此相亲与择偶标准信息由校友本人自主维护，管理员仅有查阅核实权限，不可代为修改。</span>
              </div>

              {!hasMmProfile ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
                  <div>该校友尚未录入喜结连理自身条件及择偶标准</div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.06)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', width: 130, color: '#94a3b8', fontWeight: 600 }}>条件项目</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#60a5fa', fontWeight: 700 }}>自身实际条件</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#f472b6', fontWeight: 700 }}>期望择偶标准</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row, idx) => (
                        <tr key={row.label} style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: idx % 2 === 1 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                        }}>
                          <td style={{ padding: '9px 14px', color: '#94a3b8', fontWeight: 600 }}>{row.label}</td>
                          <td style={{ padding: '9px 14px', color: '#f8fafc' }}>{row.self}</td>
                          <td style={{ padding: '9px 14px', color: '#cbd5e1' }}>{row.partner}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Basic Alumni Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>学籍学历</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <div><span style={{ color: '#94a3b8' }}>学院：</span>{alumni.college || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>专业：</span>{alumni.major || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>入学年份：</span>{alumni.enrollment_year ? `${alumni.enrollment_year}级` : '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>毕业年份：</span>{alumni.graduation_year ? `${alumni.graduation_year}届` : '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>学历层次：</span>{alumni.degree || '—'}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>职业工作</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <div><span style={{ color: '#94a3b8' }}>工作单位：</span>{alumni.company || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>职务：</span>{alumni.position || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>所属行业：</span>{alumni.industry || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>职业类别：</span>{alumni.career_type || '—'}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>联系与地域</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <div><span style={{ color: '#94a3b8' }}>手机号：</span>{alumni.phone || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>微信号：</span>{alumni.wechat_id || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>QQ号：</span>{alumni.qq || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>常住地区：</span>{alumni.region || '—'}</div>
                    <div><span style={{ color: '#94a3b8' }}>籍贯：</span>{alumni.hometown || '—'}</div>
                  </div>
                </div>
              </div>

              {onOpenEditAlumni && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      onOpenEditAlumni(alumni);
                      onClose();
                    }}
                    style={{
                      padding: '8px 18px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#60a5fa',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    ✏️ 编辑该校友基础资料 ➔
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(0, 0, 0, 0.2)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 22px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
