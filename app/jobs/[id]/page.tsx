'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: '全职', PARTTIME: '兼职', INTERN: '实习', PARTNER: '合伙人',
};

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [resumeSkills, setResumeSkills] = useState<any>(null);
  const [bioSnapshot, setBioSnapshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.authenticated) { router.push('/login'); return; }
      setUser(d.user);
    });
  }, []);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then(d => { setJob(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [jobId]);

  const handleOpenApply = async () => {
    const skillsRes = await fetch('/api/resume/skills');
    const skillsData = await skillsRes.json();
    setResumeSkills(skillsData);
    setBioSnapshot(skillsData?.bio || '');
    setShowApplyModal(true);
  };

  const handleSubmitApply = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio_snapshot: bioSnapshot }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplySuccess(true);
        setShowApplyModal(false);
        setJob((prev: any) => ({ ...prev, userApplied: true }));
        window.dispatchEvent(new Event('unreadCountUpdate'));
      } else {
        alert(data.error || '投递失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const tags = (() => { try { return JSON.parse(job?.tags || '[]'); } catch { return []; } })();
  const isOwnJob = job?.publisher_alumni_id === job?.currentAlumniId;
  const isExpired = job?.deadline && new Date(job.deadline + 'T23:59:59') < new Date();

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>加载中...</div>;
  if (!job || job.error) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>岗位不存在或已删除</div>;

  return (
    <div style={{ padding: '40px 20px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Back */}
        <Link href="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '14px', marginBottom: '24px', textDecoration: 'none' }}>
          ← 返回招聘市场
        </Link>

        {/* Main Card */}
        <div style={{
          background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: '40px',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          marginBottom: '24px',
        }}>
          {/* Status Badge */}
          {isExpired && <div style={{ marginBottom: '16px', padding: '8px 14px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>⚠️ 此岗位已过截止日期</div>}
          {applySuccess && <div style={{ marginBottom: '16px', padding: '8px 14px', background: '#ecfdf5', borderRadius: '10px', color: '#059669', fontSize: '13px', fontWeight: 600 }}>✅ 已成功投递，可在个人中心查看投递记录</div>}

          {/* Job Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: '#dbeafe', color: '#1d4ed8' }}>
                  {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                </span>
                {tags.map((tag: string, i: number) => (
                  <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>{job.job_title}</h1>
              <div style={{ fontSize: '17px', color: '#475569', fontWeight: 500, marginBottom: '4px' }}>🏢 {job.company_name}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444' }}>{job.salary_range}</div>
            </div>
          </div>

          {/* Meta Info */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '16px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '28px' }}>
            <div style={{ fontSize: '14px', color: '#475569' }}>📍 <strong>{job.location}</strong></div>
            <div style={{ fontSize: '14px', color: '#475569' }}>⏰ 截止 <strong>{job.deadline}</strong></div>
            <div style={{ fontSize: '14px', color: '#475569' }}>👤 发布人：<strong>{job.publisher_name || '校友'}</strong></div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>📄 岗位描述</h2>
            <div style={{ fontSize: '15px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '20px', borderRadius: '14px' }}>
              {job.description}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {isOwnJob ? (
              <Link href="/profile" style={{
                padding: '12px 28px', background: '#f1f5f9', border: 'none',
                borderRadius: '12px', fontWeight: 600, fontSize: '15px',
                color: '#475569', textDecoration: 'none', display: 'inline-block',
              }}>⚙️ 去个人中心管理岗位</Link>
            ) : job.userApplied ? (
              <button disabled style={{
                padding: '12px 28px', background: '#f1f5f9', border: 'none',
                borderRadius: '12px', fontWeight: 600, fontSize: '15px', color: '#94a3b8', cursor: 'not-allowed',
              }}>✅ 已投递</button>
            ) : isExpired || job.status !== 'ACTIVE' ? (
              <button disabled style={{
                padding: '12px 28px', background: '#f1f5f9', border: 'none',
                borderRadius: '12px', fontWeight: 600, fontSize: '15px', color: '#94a3b8', cursor: 'not-allowed',
              }}>岗位已关闭</button>
            ) : (
              <button
                onClick={handleOpenApply}
                style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px',
                  color: 'white', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
                  transition: 'all 0.2s',
                }}
              >
                🚀 立即投递
              </button>
            )}
          </div>
        </div>

        {/* Contact info - only shown after applying */}
        {(job.userApplied || applySuccess) && (
          <div style={{
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
            borderRadius: '20px', padding: '24px',
            border: '1px solid #d1fae5',
            boxShadow: '0 4px 16px rgba(16,185,129,0.08)',
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#065f46', marginBottom: '12px' }}>📞 联系方式</h2>
            <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{job.contact_info}</div>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.97)', borderRadius: '24px',
            padding: '36px', width: '100%', maxWidth: '560px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>🚀 投递简历</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>投递至：{job.company_name} · {job.job_title}</p>

            <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>📎 简历摘要（自动引入）</div>
                <Link href="/profile?tab=resume" target="_blank" style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  ✏️ 修改/完善简历 ↗
                </Link>
              </div>
              {resumeSkills?.skill_tags && (() => {
                try {
                  const tags = JSON.parse(resumeSkills.skill_tags);
                  return tags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {tags.map((t: string) => <span key={t} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: '#dbeafe', color: '#1d4ed8' }}>{t}</span>)}
                    </div>
                  ) : null;
                } catch { return null; }
              })()}
              <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>完整简历（教育经历、工作经历等）将随投递一同提交</div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>本次求职说明 <span style={{ color: '#94a3b8', fontWeight: 400 }}>（最多 500 字）</span></label>
              <textarea
                value={bioSnapshot}
                onChange={e => setBioSnapshot(e.target.value.slice(0, 500))}
                placeholder="简单介绍一下自己，以及为什么对这个岗位感兴趣..."
                rows={4}
                style={{
                  width: '100%', padding: '12px', border: '1px solid #e2e8f0',
                  borderRadius: '12px', fontSize: '14px', color: '#1e293b',
                  outline: 'none', resize: 'vertical', lineHeight: 1.6,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{bioSnapshot.length}/500</div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowApplyModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>取消</button>
              <button
                onClick={handleSubmitApply}
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none', borderRadius: '10px', color: 'white',
                  fontWeight: 700, fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >{submitting ? '提交中...' : '✅ 确认投递'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
