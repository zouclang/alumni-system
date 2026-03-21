'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AlumniForm from '@/components/AlumniForm';
import ImportModal from '@/components/ImportModal';

interface Alumni {
  id: number;
  seq_no: number;
  name: string;
  gender: string;
  region: string;
  college_normalized: string;
  degree: string;
  enrollment_year: string;
  graduation_year: string;
  phone: string;
  wechat_id: string;
  qq: string;
  company: string;
  position: string;
  career_type: string;
  hometown: string;
  major: string;
  interests: string;
  dut_verified: string;
}

const REGIONS = ['工业园区','吴中区','姑苏区','高新区','相城区','吴江区','昆山','太仓','常熟','张家港'];
const COLLEGES = ['MBA\\EMBA\\MEM','化工','机械','电信','建工','材料','经管','力学','软件','物理','能动','人文','建艺','电气','生工','数学'];
const DEGREES = ['本科', '硕士', '博士', '博士后'];
const GENDERS = ['男','女'];
const CAREER_TYPES = ['职业经理（含高管、职员等）','自主创业（有公司）','其他（机关事业等）','退休','自由职业（无公司）'];
const WECHAT_GROUPS = ['一群','二群','三群','四群','五群','昆山群','太仓群','常熟群','张家港群','经管一群','经管二群','软件分会'];

function degreeColor(degree: string) {
  if (!degree) return 'badge-gray';
  if (degree.includes('博士')) return 'badge-purple';
  if (degree.includes('硕士')) return 'badge-blue';
  if (degree.includes('本科')) return 'badge-green';
  return 'badge-gray';
}

function genderBadge(gender: string) {
  if (gender === '男') return '👨';
  if (gender === '女') return '👩';
  return '❓';
}

export default function HomePage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [gender, setGender] = useState('');
  const [careerType, setCareerType] = useState('');
  const [wechatGroup, setWechatGroup] = useState('');
  const [isRegistered, setIsRegistered] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Contact request state
  const [requestingAlumni, setRequestingAlumni] = useState<any>(null);
  const [contactReason, setContactReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        }
      });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
        ...(region && { region }),
        ...(college && { college }),
        ...(degree && { degree }),
        ...(gender && { gender }),
        ...(careerType && { careerType }),
        ...(wechatGroup && { wechatGroup }),
        ...(isRegistered && { registered: isRegistered }),
      });
      const res = await fetch(`/api/alumni?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, region, college, degree, gender, careerType, wechatGroup, isRegistered]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterChange = () => { setPage(1); };

  const handleExport = () => {
    const params = new URLSearchParams({
      ...(search && { search }),
      ...(region && { region }),
      ...(college && { college }),
      ...(degree && { degree }),
      ...(gender && { gender }),
      ...(careerType && { careerType }),
      ...(wechatGroup && { wechatGroup }),
      ...(isRegistered && { registered: isRegistered }),
    });
    window.open(`/api/export?${params}`, '_blank');
  };

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

  const totalPages = Math.ceil(total / pageSize);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">校友通讯录</h1>
          <p className="page-subtitle">共 {total.toLocaleString()} 位校友</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleExport}>
            📥 导出 CSV
          </button>
          {isAdmin && (
            <>
              <button className="btn btn-outline" onClick={() => setShowImport(true)}>
                📤 批量导入
              </button>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                ➕ 新增校友
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">搜索</span>
          <input
            className="search-input"
            type="text"
            placeholder="姓名、公司、职位、电话..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">所在区域</span>
          <select className="filter-select" value={region} onChange={(e) => { setRegion(e.target.value); handleFilterChange(); }}>
            <option value="">全部</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">学院</span>
          <select className="filter-select" value={college} onChange={(e) => { setCollege(e.target.value); handleFilterChange(); }}>
            <option value="">全部</option>
            {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">最高学历</span>
          <select className="filter-select" value={degree} onChange={(e) => { setDegree(e.target.value); handleFilterChange(); }}>
            <option value="">全部</option>
            {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">事业类型</span>
          <select className="filter-select" value={careerType} onChange={(e) => { setCareerType(e.target.value); handleFilterChange(); }}>
            <option value="">全部</option>
            {CAREER_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">微信群</span>
          <select className="filter-select" value={wechatGroup} onChange={(e) => { setWechatGroup(e.target.value); handleFilterChange(); }}>
            <option value="">全部</option>
            {WECHAT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {(isAdmin || user?.association_role) && (
          <div className="filter-group">
            <span className="filter-label">注册状态</span>
            <select className="filter-select" value={isRegistered} onChange={(e) => { setIsRegistered(e.target.value); handleFilterChange(); }}>
              <option value="">全部</option>
              <option value="yes">已注册</option>
              <option value="no">未注册</option>
            </select>
          </div>
        )}
        {(search || region || college || degree || careerType || wechatGroup || isRegistered) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => {
              setSearch(''); setRegion(''); setCollege('');
              setDegree(''); setCareerType(''); setWechatGroup('');
              setIsRegistered('');
              setPage(1);
            }}>✕ 清除筛选</button>
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>共有 {total} 位校友</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-text">未找到相关校友</div>
              <div className="empty-sub">尝试调整搜索或筛选条件</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>最高学历</th>
                  <th>在校经历</th>
                  <th>所在区域</th>
                  <th>公司/单位</th>
                  <th>职务</th>
                  <th>联系 / 群</th>
                </tr>
              </thead>
              <tbody>
                {data.map((alumni: any) => (
                  <tr key={alumni.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isAdmin || user?.association_role ? (
                          <Link href={`/alumni/${alumni.id}`} className="name-link" style={{ whiteSpace: 'nowrap' }}>
                            {genderBadge(alumni.gender)} {alumni.name}
                          </Link>
                        ) : (
                          <span style={{ whiteSpace: 'nowrap', color: '#111827', fontWeight: 600 }}>
                            {genderBadge(alumni.gender)} {alumni.name}
                          </span>
                        )}
                        {isAdmin && alumni.is_registered === 1 && (
                          <span className={`status-badge ${alumni.user_status === 'PENDING' ? 'status-pending' : 'status-approved'}`} style={{ fontSize: '10px', padding: '1px 4px' }}>
                            {alumni.user_status === 'PENDING' ? '待审核' : '已注册'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {alumni.degree ? (
                        <span className={`badge ${degreeColor(alumni.degree)}`}>
                          {alumni.degree.replace(/\|/g, '/')}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {alumni.experiences && alumni.experiences.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {alumni.experiences.map((exp: any, i: number) => (
                            <div key={i} style={{ fontSize: '13px', color: '#4b5563' }}>
                              <span style={{ fontWeight: 500, color: '#111827' }}>{exp.stage}</span>
                              {exp.start_year && ` ${exp.start_year}-${exp.end_year || '今'}`} 
                              {exp.college && ` · ${exp.college}`}
                              {exp.major && ` · ${exp.major}`}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="table-name">{alumni.college_normalized || '—'}</div>
                          <div className="table-sub">{alumni.major || ''}</div>
                        </>
                      )}
                    </td>
                    <td>
                      {alumni.region ? (
                        <span className="badge badge-gray">{alumni.region}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="table-name">{alumni.company || '—'}</div>
                    </td>
                    <td>{alumni.position || '—'}</td>
                    <td>
                      {alumni.is_redacted ? (
                        <button 
                          className="btn btn-outline btn-sm" 
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => setRequestingAlumni(alumni)}
                        >
                          🔒 申请对接
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ whiteSpace: 'nowrap' }}><span style={{color: '#6b7280', fontSize: '12px'}}>📞</span> {alumni.phone || '—'}</div>
                          {alumni.wechat_groups && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                              {alumni.wechat_groups.split(',').filter(Boolean).slice(0, 2).map((g: string) => (
                                <span key={g} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>{g}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="pagination">
            <span className="pagination-info">
              第 {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} 条，共 {total} 条
            </span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {pageNumbers.map((n) => (
                <button key={n} className={`page-btn ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* Contact Request Modal */}
      {requestingAlumni && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">申请对接校友</h2>
              <button className="close-btn" onClick={() => setRequestingAlumni(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
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

      {showForm && (
        <AlumniForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchData(); }}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); fetchData(); }}
        />
      )}
      
      <style jsx>{`
        .modal-content {
          background: rgba(30, 41, 59, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          color: #f1f5f9;
        }
        .modal-header {
           border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .modal-title {
          color: #ffffff;
        }
        .close-btn {
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .form-textarea {
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
          border-color: #3b82f6;
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
        .btn-primary {
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </div>
  );
}
