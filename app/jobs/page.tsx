'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: '全职',
  PARTTIME: '兼职',
  INTERN: '实习',
  PARTNER: '合伙人',
};

const TAG_COLORS = [
  '#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#ede9fe', '#ffedd5',
];
const TAG_TEXT_COLORS = [
  '#1d4ed8', '#15803d', '#a16207', '#be185d', '#6d28d9', '#c2410c',
];

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [user, setUser] = useState<any>(null);

  const pageSize = 12;

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.authenticated) router.push('/login');
      else setUser(d.user);
    });
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
        ...(jobType && { jobType }),
      });
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, jobType]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const totalPages = Math.ceil(total / pageSize);

  const formatDeadline = (d: string) => {
    if (!d) return '';
    const date = new Date(d + 'T23:59:59');
    const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return `⚠️ 今天截止`;
    if (diff <= 3) return `⚠️ 仅剩 ${diff} 天`;
    if (diff <= 7) return `📅 还剩 ${diff} 天`;
    return `截止 ${d}`;
  };

  return (
    <div style={{ padding: '40px 20px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>🤝 校友招聘</h1>
            <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>共 {total} 个在招岗位</p>
          </div>
          {user?.role !== 'ADMIN' && (
            <Link href="/jobs/post" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
              textDecoration: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              transition: 'all 0.2s',
            }}>
              ➕ 发布招聘
            </Link>
          )}
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)',
          padding: '16px 20px', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <input
            type="text"
            placeholder="搜索岗位名称、公司..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              flex: 1, minWidth: '200px', padding: '10px 16px',
              border: '1px solid #e2e8f0', borderRadius: '10px',
              fontSize: '14px', outline: 'none', color: '#1e293b',
              background: '#fff',
            }}
          />
          <select
            value={jobType}
            onChange={e => { setJobType(e.target.value); setPage(1); }}
            style={{
              padding: '10px 16px', border: '1px solid #e2e8f0',
              borderRadius: '10px', fontSize: '14px', color: '#1e293b',
              background: '#fff', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">全部类型</option>
            <option value="FULLTIME">全职</option>
            <option value="PARTTIME">兼职</option>
            <option value="INTERN">实习</option>
            <option value="PARTNER">合伙人</option>
          </select>
          {(search || jobType) && (
            <button
              onClick={() => { setSearch(''); setJobType(''); setPage(1); }}
              style={{
                padding: '10px 16px', border: '1px solid #e2e8f0',
                borderRadius: '10px', fontSize: '13px', color: '#64748b',
                background: '#f8fafc', cursor: 'pointer',
              }}
            >
              ✕ 清除
            </button>
          )}
        </div>

        {/* Job Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8', fontSize: '15px' }}>加载中...</div>
        ) : jobs.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px', color: '#94a3b8',
            background: 'rgba(255,255,255,0.7)', borderRadius: '20px',
            border: '1px dashed #cbd5e1',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>暂无相关招聘信息</div>
            <div style={{ fontSize: '13px', marginTop: '8px' }}>尝试调整搜索条件，或成为第一个发布招聘的校友</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {jobs.map((job: any) => {
              const tags = (() => { try { return JSON.parse(job.tags || '[]'); } catch { return []; } })();
              const deadlineStr = formatDeadline(job.deadline);
              const isUrgent = deadlineStr.startsWith('⚠️');
              return (
                <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
                    borderRadius: '20px', padding: '24px',
                    border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.5)'}`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    cursor: 'pointer', height: '100%', boxSizing: 'border-box' as any,
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.10)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = '';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.5)';
                    }}
                  >
                    {/* Job Type + Alumni Company + Salary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                          borderRadius: '100px', background: '#dbeafe', color: '#1d4ed8',
                        }}>
                          {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                        </span>
                        {job.is_alumni_company === 1 && (
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                            borderRadius: '100px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                            color: '#92400e', border: '1px solid #fcd34d',
                            boxShadow: '0 2px 4px rgba(245,158,11,0.15)',
                          }}>
                            🏢 校友企业
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>
                        {job.salary_range}
                      </span>
                    </div>
                    {/* Title */}
                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', lineHeight: 1.3 }}>
                      {job.job_title}
                    </div>
                    {/* Company */}
                    <div style={{ fontSize: '14px', color: '#475569', marginBottom: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🏢 {job.company_name}</span>
                    </div>
                    {/* Location */}
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                      📍 {job.location}
                    </div>
                    {/* Tags */}
                    {tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                        {tags.slice(0, 3).map((tag: string, i: number) => (
                          <span key={tag} style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                            background: TAG_COLORS[i % TAG_COLORS.length],
                            color: TAG_TEXT_COLORS[i % TAG_TEXT_COLORS.length],
                            fontWeight: 600,
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>by {job.publisher_name || '校友'}</span>
                      <span style={{ fontSize: '12px', color: isUrgent ? '#ef4444' : '#94a3b8', fontWeight: isUrgent ? 600 : 400 }}>
                        {deadlineStr}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: page === 1 ? '#f8fafc' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#475569' }}>
              ‹ 上一页
            </button>
            <span style={{ padding: '8px 16px', color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              第 {page} / {totalPages} 页
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: page === totalPages ? '#f8fafc' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#475569' }}>
              下一页 ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
