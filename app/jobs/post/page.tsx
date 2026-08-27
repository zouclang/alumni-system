'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PRESET_TAGS = ['急招', '校友优先', '内推', '弹性工作', '远程可', '股权激励', '期权', '高成长'];

export default function PostJobPage() {
  const router = useRouter();
  const [alumni, setAlumni] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [useProfileCompany, setUseProfileCompany] = useState(true);
  const [form, setForm] = useState({
    company_name: '',
    job_title: '',
    job_type: 'FULLTIME',
    location: '',
    salary_range: '',
    description: '',
    contact_info: '',
    deadline: '',
    tags: [] as string[],
  });

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async d => {
      if (!d.authenticated) { router.push('/login'); return; }
      if (d.user.alumniId) {
        const aRes = await fetch(`/api/alumni/${d.user.alumniId}`);
        const aData = await aRes.json();
        setAlumni(aData);
        setForm(prev => ({
          ...prev,
          company_name: aData.company || '',
          contact_info: aData.phone ? `电话：${aData.phone}` : '',
        }));
      }
    });
  }, []);

  const handleCompanyToggle = (useProfile: boolean) => {
    setUseProfileCompany(useProfile);
    if (useProfile && alumni?.company) {
      setForm(prev => ({ ...prev, company_name: alumni.company }));
    } else {
      setForm(prev => ({ ...prev, company_name: '' }));
    }
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, use_profile_company: useProfileCompany }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/jobs/${data.id}`);
      } else {
        alert(data.error || '发布失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
    borderRadius: '10px', fontSize: '14px', color: '#1e293b', outline: 'none',
    boxSizing: 'border-box' as any, background: '#fff',
  };
  const labelStyle = { fontSize: '14px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' };
  const fieldStyle = { marginBottom: '22px' };

  return (
    <div style={{ padding: '40px 20px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: 0 }}>➕ 发布招聘</h1>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>填写岗位信息，发布后立即对所有校友可见</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: '40px',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        }}>
          <form onSubmit={handleSubmit}>
            {/* Company */}
            <div style={fieldStyle}>
              <label style={labelStyle}>招聘企业 *</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button type="button"
                  onClick={() => handleCompanyToggle(true)}
                  style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderColor: useProfileCompany ? '#3b82f6' : '#e2e8f0', background: useProfileCompany ? '#eff6ff' : '#fff', color: useProfileCompany ? '#2563eb' : '#64748b' }}>
                  使用当前单位 {alumni?.company ? `（${alumni.company}）` : ''}
                </button>
                <button type="button"
                  onClick={() => handleCompanyToggle(false)}
                  style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderColor: !useProfileCompany ? '#3b82f6' : '#e2e8f0', background: !useProfileCompany ? '#eff6ff' : '#fff', color: !useProfileCompany ? '#2563eb' : '#64748b' }}>
                  自定义企业
                </button>
              </div>
              {!useProfileCompany && (
                <input style={inputStyle} placeholder="请输入企业名称" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} required />
              )}
              {useProfileCompany && alumni?.company && (
                <div style={{ fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px' }}>✓ 将使用：{alumni.company}</div>
              )}
            </div>

            {/* Job Title */}
            <div style={fieldStyle}>
              <label style={labelStyle}>岗位名称 *</label>
              <input style={inputStyle} placeholder="如：Java 后端工程师、市场运营总监" value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} required />
            </div>

            {/* Type + Location */}
            <div style={{ ...fieldStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>岗位类型 *</label>
                <select style={inputStyle} value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))}>
                  <option value="FULLTIME">全职</option>
                  <option value="PARTTIME">兼职</option>
                  <option value="INTERN">实习</option>
                  <option value="PARTNER">合伙人</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>工作地点 *</label>
                <input style={inputStyle} placeholder="如：苏州工业园区" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} required />
              </div>
            </div>

            {/* Salary + Deadline */}
            <div style={{ ...fieldStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>薪资范围 *</label>
                <input style={inputStyle} placeholder="如：15K-25K 或 面议" value={form.salary_range} onChange={e => setForm(p => ({ ...p, salary_range: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>截止日期 *</label>
                <input type="date" style={inputStyle} value={form.deadline} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} required />
              </div>
            </div>

            {/* Tags */}
            <div style={fieldStyle}>
              <label style={labelStyle}>岗位标签（可选）</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PRESET_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    style={{ padding: '5px 14px', borderRadius: '8px', border: '1px solid', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', borderColor: form.tags.includes(tag) ? '#3b82f6' : '#e2e8f0', background: form.tags.includes(tag) ? '#eff6ff' : '#fff', color: form.tags.includes(tag) ? '#2563eb' : '#64748b' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={fieldStyle}>
              <label style={labelStyle}>岗位描述 *</label>
              <textarea style={{ ...inputStyle, minHeight: '160px', resize: 'vertical', lineHeight: 1.7 }} placeholder="请描述岗位职责、任职要求等..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
            </div>

            {/* Contact */}
            <div style={fieldStyle}>
              <label style={labelStyle}>联系方式 *
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>仅投递者可见</span>
              </label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', lineHeight: 1.7 }} placeholder="如：微信：xxx，电话：138xxxxx" value={form.contact_info} onChange={e => setForm(p => ({ ...p, contact_info: e.target.value }))} required />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button type="button" onClick={() => router.back()}
                style={{ padding: '12px 24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
                取消
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                {submitting ? '发布中...' : '🚀 立即发布'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
