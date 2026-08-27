'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function genderBadge(gender: string) {
  if (gender === '男') return '👨';
  if (gender === '女') return '👩';
  return '';
}

export default function CouncilPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Contact request state
  const [requestingAlumni, setRequestingAlumni] = useState<any>(null);
  const [contactReason, setContactReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(res => res.json()),
      fetch('/api/council').then(res => res.json())
    ]).then(([userData, councilData]) => {
      if (userData.authenticated) setUser(userData.user);
      if (Array.isArray(councilData)) setData(councilData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleContactRequest = async () => {
    if (!requestingAlumni || !contactReason.trim()) return;
    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAlumniId: requestingAlumni.id,
          reason: contactReason
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('申请已提交，请等待管理员审核。您可以在个人中心查看进度。');
        setRequestingAlumni(null);
        setContactReason('');
      } else {
        alert(data.error || '申请失败');
      }
    } catch (e) {
      alert('网络错误');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isPrivileged = isAdmin || (user?.association_role && user?.association_role !== '普通校友');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">理事会成员</h1>
          <p className="page-subtitle">共 {data.length} 位理事会成员</p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏛️</div>
              <div className="empty-text">暂无理事会成员信息</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>在校经历</th>
                  {isPrivileged && <th>所在区域</th>}
                  {isPrivileged && <th>最高学历</th>}
                  <th>公司/单位</th>
                  <th>公司职务</th>
                  <th>联系电话 / 所在群</th>
                </tr>
              </thead>
              <tbody>
                {data.map((alumni: any) => {
                  const renderMasked = (value: string | null) => {
                    if (!value || value === '—') return '—';
                    if (typeof value === 'string' && value.includes('***')) {
                      return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>已隐藏</span>;
                    }
                    return value;
                  };

                  return (
                    <tr key={alumni.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Link href={`/alumni/${alumni.id}`} className="hover:underline">
                            <span style={{ fontWeight: 600, color: 'var(--blue-dark)', fontSize: '15px' }}>
                              {genderBadge(alumni.gender)} {alumni.name}
                            </span>
                          </Link>
                          {alumni.association_role && alumni.association_role !== '—' && (
                            <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              {alumni.association_role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {alumni.is_redacted ? (
                           <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>已隐藏</span>
                        ) : alumni.experiences && alumni.experiences.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {alumni.experiences.map((exp: any, i: number) => {
                              const isHidden = typeof exp.stage === 'string' && exp.stage.includes('***');
                              return (
                                <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                  {isHidden ? (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>已隐藏</span>
                                  ) : (
                                    <>
                                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{exp.stage}</span>
                                      {(exp.start_year || exp.end_year) && ` ${exp.start_year || '?'}-${exp.end_year || '?'}`} 
                                      {exp.college && ` · ${exp.college}`}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="table-name">{alumni.college_normalized || '—'}</div>
                        )}
                      </td>
                      {isPrivileged && (
                        <td>{renderMasked(alumni.region)}</td>
                      )}
                      {isPrivileged && (
                        <td>
                          {alumni.degree ? (
                             alumni.degree.includes('***') ? renderMasked(alumni.degree) : <span className={`badge badge-gray`} style={{fontSize: '11px'}}>{alumni.degree}</span>
                          ) : '—'}
                        </td>
                      )}
                      <td>
                        <div className="table-name">{renderMasked(alumni.company)}</div>
                      </td>
                      <td>
                        {renderMasked(alumni.position)}
                      </td>
                    <td>
                      {(alumni.phone && alumni.phone.includes('***') && alumni.id !== user?.alumniId) ? (
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                          onClick={() => setRequestingAlumni(alumni)}
                        >
                          🤝 申请对接
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ whiteSpace: 'nowrap' }}><span style={{color: 'var(--text-muted)', fontSize: '12px'}}>📞</span> {renderMasked(alumni.phone)}</div>
                          {alumni.wechat_groups && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                              {alumni.wechat_groups.split(',').filter(Boolean).slice(0, 2).map((g: string) => (
                                <span key={g} className="badge badge-blue" style={{ padding: '2px 6px', fontSize: '11px', whiteSpace: 'nowrap' }}>{renderMasked(g)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {requestingAlumni && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">申请对接理事</h2>
              <button className="close-btn" onClick={() => setRequestingAlumni(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '16px' }}>
                您正在申请与 <strong>{requestingAlumni.name}</strong> 对接。请提供您的对接理由，管理员审核通过后将向您展示联系方式。
              </p>
              <textarea
                className="form-textarea"
                placeholder="请输入对接理由（例如：业务合作、同行业交流等）"
                value={contactReason}
                onChange={(e) => setContactReason(e.target.value)}
                style={{ width: '100%', minHeight: '100px', marginBottom: '20px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => setRequestingAlumni(null)}>取消</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleContactRequest}
                  disabled={submittingRequest || !contactReason.trim()}
                >
                  {submittingRequest ? '提交中...' : '提交申请'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }
        .modal-content {
          background: rgba(30, 41, 59, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
          color: #f1f5f9;
        }
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }
        .close-btn {
          border: none;
          background: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .form-textarea {
          width: 100%;
          padding: 12px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 14px;
          color: #ffffff;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }
        .btn-outline {
          background: #ffffff !important;
          color: #1e293b !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .btn-outline:hover {
          background: #f1f5f9 !important;
          transform: translateY(-1px);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
