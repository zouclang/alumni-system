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

function DetailItem({ label, value, nodeValue }: { label: string; value?: string | number | null; nodeValue?: React.ReactNode }) {
  return (
    <div>
      <div className="detail-item-label">{label}</div>
      <div className={`detail-item-value ${(!value && !nodeValue) ? 'empty' : ''}`}>
        {nodeValue || value || '—'}
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

  const handleDelete = async () => {
    if (!confirm(`确认删除「${alumni?.name}」的记录？此操作不可撤销。`)) return;
    setDeleting(true);
    console.log(`Attempting to delete alumni ID: ${id}`);
    try {
      const res = await fetch(`/api/alumni/${id}`, { method: 'DELETE' });
      if (res.ok) {
        console.log('Delete successful, redirecting...');
        router.push('/');
      } else {
        const err = await res.json().catch(() => ({ error: '服务器返回了不可读的错误' }));
        console.error('Delete failed:', err);
        alert(`删除失败: ${err.error || '未知错误'}`);
        setDeleting(false);
      }
    } catch (e) {
      console.error('Network or fetch error:', e);
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
  const canCorrect = (isCouncil || (alumni.is_redacted === false)) && !isSelf;

  if (!isAdmin && !isCouncil && !isSelf) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <div className="empty-text">无权访问</div>
        <div className="empty-sub">普通成员仅限在通讯录列表查看校友基础及授权信息</div>
        <button className="btn btn-outline" onClick={() => router.push('/')} style={{ marginTop: '20px' }}>返回通讯录</button>
      </div>
    );
  }

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
            {alumni.experiences && alumni.experiences.length > 0 
              ? alumni.experiences.map((e: any) => `${e.stage} ${e.college}`).join(' · ')
              : `${alumni.college_normalized || ''} ${alumni.degree || ''} ${alumni.enrollment_year ? alumni.enrollment_year+'届' : ''}`}
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
          <DetailItem label="性别" value={alumni.gender} />
          <DetailItem label="家乡" value={alumni.hometown} />
          <DetailItem label="生日月份" value={alumni.birth_month} />
          <DetailItem label="所在区域" value={alumni.region} />
          <DetailItem label="兴趣爱好" value={alumni.interests} />
          <DetailItem label="微信号" value={alumni.wechat_id} />
          <DetailItem label="联系电话" value={alumni.phone} />
          <DetailItem label="最高学历" value={alumni.degree} />
          <DetailItem 
            label="所在微信群" 
            nodeValue={
              alumni.wechat_groups ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {alumni.wechat_groups.split(',').filter(Boolean).map((g: string) => (
                    <span key={g} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', fontSize: '13px', whiteSpace: 'nowrap' }}>{g}</span>
                  ))}
                </div>
              ) : null
            }
          />
        </div>
      </div>

      {/* Education */}
      <div className="card card-body detail-section">
        <div className="detail-section-title">教育背景</div>
        {alumni.experiences && alumni.experiences.length > 0 ? (
          <div className="timeline" style={{ marginTop: '16px', marginLeft: '12px', borderLeft: '2px solid #e5e7eb', paddingLeft: '24px', position: 'relative' }}>
            {alumni.experiences.map((exp: any, i: number) => (
              <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{ position: 'absolute', left: '-31px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid white' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{exp.stage}</span>
                  <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '13px' }}>{exp.start_year || '?'} - {exp.end_year || '至今'}</span>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>
                    {exp.college}{exp.major && ` · ${exp.major}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="detail-grid" style={{ marginTop: '16px' }}>
            <DetailItem label="学院" value={alumni.college} />
            <DetailItem label="整理后学院" value={alumni.college_normalized} />
            <DetailItem label="专业" value={alumni.major} />
            <DetailItem label="最高学历" value={alumni.degree} />
            <DetailItem label="入学时间" value={alumni.enrollment_year} />
            <DetailItem label="毕业年份" value={alumni.graduation_year} />
          </div>
        )}
      </div>

      {/* Career */}
      <div className="card card-body detail-section">
        <div className="detail-section-title">职业信息</div>
        <div className="detail-grid">
          <DetailItem label="工作单位" value={alumni.company} />
          <DetailItem label="职位" value={alumni.position} />
          <DetailItem label="事业类型" value={alumni.career_type} />
          <DetailItem label="所属行业" value={alumni.industry} />
          <div className="detail-item span-2">
            <div className="detail-label">主营背景/业务介绍</div>
            <div className="detail-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{alumni.business_desc || '-'}</div>
          </div>
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
