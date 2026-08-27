'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AlumniForm from '@/components/AlumniForm';

interface Alumni {
  id: number;
  seq_no: number;
  name: string;
  hometown: string;
  school_experience: string;
  enrollment_year: string;
  graduation_year: string;
  college: string;
  college_normalized: string;
  major: string;
  degree: string;
  phone: string;
  interests: string;
  wechat_id: string;
  qq: string;
  dut_verified: string;
  birth_month: number;
  gender: string;
  region: string;
  career_type: string;
  company: string;
  position: string;
  industry: string;
  social_roles: string;
  business_desc: string;
  wechat_groups: string;
  experiences: {
    stage: string;
    start_year: string;
    end_year: string;
    college: string;
    major: string;
    sort_order: number;
  }[];
}

function formatMaskedValue(value: any) {
  if (typeof value === 'string' && (value.includes('***') || value.includes('****'))) {
    return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>已隐藏</span>;
  }
  return value || '—';
}

function DetailItem({ label, value, nodeValue, fullWidth }: { label: string; value?: string | number | null; nodeValue?: React.ReactNode; fullWidth?: boolean }) {
  const isMasked = typeof value === 'string' && (value.includes('***') || value.includes('****'));
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <div className="detail-item-label">{label}</div>
      <div className={`detail-item-value ${(!value && !nodeValue) ? 'empty' : ''} ${isMasked ? 'masked' : ''}`}>
        {nodeValue ? nodeValue : (isMasked ? <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>已隐藏</span> : (value || '—'))}
      </div>
    </div>
  );
}

export default function AlumniDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [alumni, setAlumni] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionContent, setCorrectionContent] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/alumni/${id}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json())
    ]).then(([alumniData, authData]) => {
      setAlumni(alumniData);
      if (authData.authenticated) setSession(authData.user);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    console.log(`Attempting to delete alumni ID: ${id}`);
    try {
      const res = await fetch(`/api/alumni/${id}`, { method: 'DELETE' });
      if (res.ok) {
        console.log('Delete successful, redirecting...');
        router.push('/');
      } else {
        let errorMsg = '未找到记录或服务器繁忙 (404/500)';
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
          console.warn('Delete failed (API Error):', err);
        } catch (e) {
          const text = await res.text().catch(() => '');
          console.warn('Delete failed (Non-JSON Error):', text);
          if (text.includes('not found') || res.status === 404) errorMsg = '记录已被删除 (404)';
        }
        alert(`删除失败: ${errorMsg}`);
        setDeleting(false);
      }
    } catch (e) {
      console.warn('Network or fetch error:', e);
      alert('网络请求失败，请检查网络连接或刷新页面重试');
      setDeleting(false);
    }
  };

  const handleCorrectionSubmit = async () => {
    if (!correctionContent.trim()) return;
    setSubmittingCorrection(true);
    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumniId: id, content: correctionContent }),
      });
      if (res.ok) {
        alert('纠正信息已提交，请等待管理员审核。');
        setShowCorrection(false);
        setCorrectionContent('');
      } else {
        alert('提交失败');
      }
    } catch (e) {
      alert('提交失败');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleSaved = async () => {
    setShowEdit(false);
    const res = await fetch(`/api/alumni/${id}`);
    setAlumni(await res.json());
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!alumni) return <div className="empty-state"><div className="empty-icon">⚠️</div><div className="empty-text">未找到该校友记录</div></div>;

  const isAdmin = session?.role === 'ADMIN';
  const isCouncil = !!session?.association_role;
  const isSelf = session?.alumniId === parseInt(id);
  const canEdit = isAdmin || isSelf; // Council cannot edit others
  const canCorrect = isCouncil && !isAdmin && !isSelf;

  // Removed strict lock to allow "Clicking name can enter details page"
  // Masking is handled at field-level via API and DetailItem

  return (
    <div className="fade-in">
      {/* Back + Actions */}
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => router.back()} style={{ marginBottom: '12px' }}>
            ← 返回列表
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {alumni.gender === '男' ? '👨' : alumni.gender === '女' ? '👩' : '👤'} {alumni.name}
            </h1>
            {alumni.registration?.isRegistered ? (
               <span className="badge badge-blue">已注册用户</span>
            ) : (
               <span className="badge badge-outline" style={{ opacity: 0.6 }}>未注册账号</span>
            )}
            {alumni.dut_verified === '是' && (
              <span className="badge badge-orange">✓ 大工人认证</span>
            )}
            {alumni.association_role && (
              <span className="badge badge-green">{alumni.association_role}</span>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: '8px' }}>
            {alumni.is_redacted 
              ? '大连理工大学校友'
              : (alumni.experiences && alumni.experiences.length > 0 
                  ? alumni.experiences.map((e: any) => `${e.stage} ${e.college}`).join(' · ')
                  : `${alumni.college_normalized || alumni.college || ''} ${alumni.degree || ''} ${alumni.enrollment_year ? alumni.enrollment_year+'届' : ''}`).replace(/\*+/g, '已隐藏')}
          </p>
        </div>
        <div className="header-actions">
          {canCorrect && (
            <button className="btn btn-primary" onClick={() => setShowCorrection(true)}>💡 纠正信息</button>
          )}
          {canEdit && (
            <>
              <button className="btn btn-outline" onClick={() => setShowEdit(true)}>✏️ 编辑</button>
              {isAdmin && (
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? '删除中...' : '🗑 删除'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="card card-body detail-section">
        <div className="detail-section-title">基本信息</div>
        <div className="detail-grid">
          <DetailItem label="姓名" value={alumni.name} />
          
          {(isAdmin || isCouncil || isSelf) && (
            <>
              <DetailItem label="性别" value={alumni.gender} />
              <DetailItem label="家乡" value={alumni.hometown} />
              <DetailItem label="生日月份" value={alumni.birth_month} />
              <DetailItem label="所在区域" value={alumni.region} />
              <DetailItem label="兴趣爱好" value={alumni.interests} />
            </>
          )}

          <DetailItem label="微信号" value={alumni.wechat_id} />
          <DetailItem label="联系电话" value={alumni.phone} />
          
          {(isAdmin || isCouncil || isSelf) && (
            <DetailItem label="最高学历" value={alumni.degree} />
          )}

          <DetailItem 
            label="所在微信群" 
            nodeValue={
              !alumni.wechat_groups ? null :
              (alumni.wechat_groups.includes('***') || alumni.wechat_groups.includes('****')) ? (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>已隐藏</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {alumni.wechat_groups.split(',').filter(Boolean).map((g: string) => (
                    <span key={g} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', fontSize: '13px', whiteSpace: 'nowrap' }}>{g}</span>
                  ))}
                </div>
              )
            }
          />
        </div>
      </div>

      {/* Education */}
      <div className="card card-body detail-section">
        <div className="detail-section-title">教育经历</div>
        <div className="timeline" style={{ marginTop: '16px', marginLeft: '12px', borderLeft: '2px solid #e5e7eb', paddingLeft: '24px', position: 'relative' }}>
          {(alumni.experiences && alumni.experiences.length > 0) ? (
            alumni.experiences.map((exp: any, i: number) => {
              const isHidden = typeof exp.stage === 'string' && exp.stage.includes('***');
              return (
                <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
                  <div style={{ position: 'absolute', left: '-31px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid white' }} />
                  {isHidden ? (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>已隐藏</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{exp.stage}</span>
                      {(exp.start_year || exp.end_year) && (
                        <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '13px' }}>
                          {exp.start_year || '?'} - {exp.end_year || '?'}
                        </span>
                      )}
                      <span style={{ color: '#4b5563', fontSize: '14px' }}>
                        {exp.college}{exp.major && <> · {exp.major}</>}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <div style={{ position: 'absolute', left: '-31px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid white' }} />
              {(typeof alumni.degree === 'string' && alumni.degree.includes('***')) ? (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>已隐藏</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{alumni.degree || '—'}</span>
                  {(alumni.enrollment_year || alumni.graduation_year) && (
                    <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '13px' }}>
                      {alumni.enrollment_year || '?'} - {alumni.graduation_year || '?'}
                    </span>
                  )}
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>
                    {alumni.college_normalized || alumni.college || '—'}
                    {(alumni.major) && <> · {alumni.major}</>}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Career */}
      <div className="card card-body detail-section">
        <div className="detail-section-title">职业信息</div>
        <div className="detail-grid">
          <DetailItem label="工作单位" value={alumni.company} />
          <DetailItem label="职位" value={alumni.position} />
          <DetailItem label="事业类型" value={alumni.career_type} />
          <DetailItem label="所属行业" value={alumni.industry} />
          <DetailItem 
            label="个人或公司主要业务介绍" 
            fullWidth
            nodeValue={
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {(alumni.is_redacted && !alumni.is_business_public) ? <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>已隐藏</span> : (alumni.business_desc || '—')}
              </div>
            }
          />
          <DetailItem label="社会职务" value={alumni.social_roles} />
        </div>
      </div>

      {showEdit && (
        <AlumniForm
          initial={alumni as unknown as Record<string, string | number | null>}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}

      {showCorrection && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">💡 纠正校友信息</h2>
              <button className="close-btn" onClick={() => setShowCorrection(false)}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px', lineHeight: 1.5 }}>
                如果您发现 <strong>{alumni.name}</strong> 的信息有误（如联系方式、任职等），请在下方说明：
              </p>
              <textarea
                className="form-textarea"
                placeholder="请输入需要修正的内容..."
                value={correctionContent}
                onChange={(e) => setCorrectionContent(e.target.value)}
                style={{ width: '100%', minHeight: '120px', marginBottom: '24px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#1e293b', fontSize: '14px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => setShowCorrection(false)}>取消</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleCorrectionSubmit}
                  disabled={!correctionContent.trim() || submittingCorrection}
                >
                  {submittingCorrection ? '提交中...' : '提交建议'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#ef4444' }}>⚠️ 确认删除</h2>
              <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', color: '#1e293b', marginBottom: '8px', fontWeight: 600 }}>
                确认要删除「{alumni.name}」的档案吗？
              </p>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                此操作将永久移除该校友的所有历史记录（包括在校经历、关联申请等），且无法撤销。
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>取消</button>
                <button 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                  style={{ background: '#ef4444', color: 'white' }}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #ffffff; border-radius: 24px; width: 90%; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-size: 18px; font-weight: 700; color: #0f172a; }
        .close-btn { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; }
        .badge-outline { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        .badge-blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        .badge-green { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
      `}</style>
    </div>
  );
}
