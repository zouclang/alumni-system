'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AlumniForm from '@/components/AlumniForm';
import { calculateProfileCompletion, COMPLETION_THRESHOLD, isProfileEligible } from '@/lib/profile-utils';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [alumni, setAlumni] = useState<any>(null);
  const [completion, setCompletion] = useState<number>(0);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string }>({ eligible: false });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'info' | 'password' | 'requests' | 'resume' | 'my-jobs' | 'my-applications'>('info');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const router = useRouter();

  const [contactRequests, setContactRequests] = useState<{ outgoing: any[], incoming: any[] }>({ outgoing: [], incoming: [] });
  
  // Resume state
  const [workExperiences, setWorkExperiences] = useState<any[]>([]);
  const [skills, setSkills] = useState<{ skill_tags: string; languages: string; bio: string }>({ skill_tags: '[]', languages: '[]', bio: '' });
  const [editingWork, setEditingWork] = useState<any>(null);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [workForm, setWorkForm] = useState({ company: '', position: '', location: '', start_year: '', end_year: '', is_current: false, description: '' });
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  // Jobs state
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [selectedJobApps, setSelectedJobApps] = useState<{ jobId: number; apps: any[] } | null>(null);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [viewingResume, setViewingResume] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const handleOpenApplicantResume = async (alumniId: number) => {
    setResumeLoading(true);
    try {
      const res = await fetch(`/api/alumni/${alumniId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingResume(data);
      } else {
        alert('无法加载校友简历');
      }
    } catch {
      alert('网络连接超时，请重试');
    } finally {
      setResumeLoading(false);
    }
  };
  
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      // Force UTC interpretation for SQLite timestamps like "2024-03-28 06:47:00"
      const isoStr = dateStr.includes(' ') && !dateStr.includes('Z') && !dateStr.includes('+')
        ? dateStr.replace(' ', 'T') + 'Z' 
        : dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')
          ? dateStr + 'Z'
          : dateStr;
      const d = new Date(isoStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['info', 'password', 'requests', 'resume', 'my-jobs', 'my-applications'].includes(tab)) {
        setCurrentView(tab as any);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (currentView === 'requests' && user?.role !== 'ADMIN') {
      fetch('/api/notifications/mark-read', { method: 'POST' })
        .then(() => window.dispatchEvent(new Event('unreadCountUpdate')));
    }
    if (currentView === 'resume') fetchResume();
    if (currentView === 'my-jobs') { fetchMyJobs(); window.dispatchEvent(new Event('unreadCountUpdate')); }
    if (currentView === 'my-applications') fetchMyApplications();
  }, [currentView, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        fetchRequests(data.user);
        if (data.user.role === 'ADMIN') {
          setCurrentView('requests'); // Admins don't have info tab
        }
        if (data.user.alumniId) {
          const aRes = await fetch(`/api/alumni/${data.user.alumniId}`);
          const aData = await aRes.json();
          setAlumni(aData);
          const percent = calculateProfileCompletion(aData, aData.experiences);
          setCompletion(percent);
          setEligibility(isProfileEligible(aData, aData.experiences));
        }
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async (currentUser?: any) => {
    const role = currentUser?.role || user?.role;
    try {
      const res = await fetch(role === 'ADMIN' ? '/api/admin/audit-logs' : '/api/contact-requests');
      if (res.ok) {
        const data = await res.json();
        if (role === 'ADMIN') {
          setAuditLogs(data);
        } else {
          setContactRequests(data);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchResume = async () => {
    try {
      const [workRes, skillsRes] = await Promise.all([
        fetch('/api/resume/work'),
        fetch('/api/resume/skills'),
      ]);
      if (workRes.ok) setWorkExperiences(await workRes.json());
      if (skillsRes.ok) setSkills(await skillsRes.json());
    } catch (err) { console.error(err); }
  };

  const fetchMyJobs = async () => {
    try {
      const res = await fetch('/api/jobs/my');
      if (res.ok) setMyJobs(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await fetch('/api/jobs/applications/my');
      if (res.ok) setMyApplications(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleJobAction = async (jobId: number, action: 'WITHDRAWN' | 'ACTIVE') => {
    if (!confirm(action === 'WITHDRAWN' ? '确定撤回该岗位？' : '确定重新发布该岗位？')) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) { fetchMyJobs(); alert(action === 'WITHDRAWN' ? '已撤回' : '已重新发布'); }
      else { const d = await res.json(); alert(d.error || '操作失败'); }
    } catch { alert('网络错误'); }
  };

  const handleWithdrawApplication = async (appId: number) => {
    if (!confirm('确定撤回该投递？')) return;
    try {
      const res = await fetch(`/api/jobs/applications/${appId}/withdraw`, { method: 'POST' });
      if (res.ok) { fetchMyApplications(); alert('已撤回投递'); }
      else { const d = await res.json(); alert(d.error || '撤回失败'); }
    } catch { alert('网络错误'); }
  };

  const handleSaveWork = async () => {
    const url = editingWork ? `/api/resume/work/${editingWork.id}` : '/api/resume/work';
    const method = editingWork ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workForm),
      });
      if (res.ok) {
        setShowWorkForm(false);
        setEditingWork(null);
        setWorkForm({ company: '', position: '', location: '', start_year: '', end_year: '', is_current: false, description: '' });
        fetchResume();
      } else { const d = await res.json(); alert(d.error || '保存失败'); }
    } catch { alert('网络错误'); }
  };

  const handleDeleteWork = async (id: number) => {
    if (!confirm('确定删除此工作经历？')) return;
    try {
      const res = await fetch(`/api/resume/work/${id}`, { method: 'DELETE' });
      if (res.ok) fetchResume();
    } catch { alert('网络错误'); }
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      let parsedTags: string[] = [];
      try { parsedTags = JSON.parse(skills.skill_tags); } catch { parsedTags = []; }
      const res = await fetch('/api/resume/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_tags: parsedTags, languages: [], bio: skills.bio }),
      });
      if (res.ok) alert('技能信息已保存');
      else { const d = await res.json(); alert(d.error || '保存失败'); }
    } finally { setSavingSkills(false); }
  };

  const addSkillTag = (tag: string) => {
    if (!tag.trim()) return;
    try {
      const tags = JSON.parse(skills.skill_tags || '[]');
      if (!tags.includes(tag.trim())) setSkills(prev => ({ ...prev, skill_tags: JSON.stringify([...tags, tag.trim()]) }));
    } catch { setSkills(prev => ({ ...prev, skill_tags: JSON.stringify([tag.trim()]) })); }
    setSkillInput('');
  };

  const removeSkillTag = (tag: string) => {
    try {
      const tags = JSON.parse(skills.skill_tags || '[]');
      setSkills(prev => ({ ...prev, skill_tags: JSON.stringify(tags.filter((t: string) => t !== tag)) }));
    } catch {}
  };

  const handleRequestAction = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`确定要${status === 'APPROVED' ? '通过' : '拒绝'}该申请吗？`)) return;
    
    try {
      const res = await fetch(`/api/contact-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        // Refresh local data and sync sidebar
        window.dispatchEvent(new Event('unreadCountUpdate'));
        fetchRequests(); 
        if (status === 'APPROVED') {
          alert('已通过该对接申请，对方现在可以查看您的联系方式。');
        } else {
          alert('已拒绝该对接申请。');
        }
      } else {
        const error = await res.json();
        alert(error.error || '操作失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    
    if (passwordForm.new !== passwordForm.confirm) {
      setPassError('新密码两次输入不一致');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldPassword: passwordForm.old, 
          newPassword: passwordForm.new 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPassSuccess('密码修改成功');
        setPasswordForm({ old: '', new: '', confirm: '' });
      } else {
        setPassError(data.error || '修改失败');
      }
    } catch (err) {
      setPassError('连接服务器失败');
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  const roleLabels: Record<string, string> = {
    'ADMIN': '系统管理员',
    'COUNCIL': '理事 (全量查看)',
    'USER': '普通成员'
  };

  // Determine actual display role (from session association_role if present)
  const displayRole = user?.association_role || roleLabels[user?.role] || user?.role;

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* User Header Section */}
        <div className="user-profile-header">
          <div className="header-main">
            <div className="user-avatar-large">
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} />
            </div>
            <div className="user-identity">
              <h1>{alumni?.name || user?.username || '用户'}</h1>
              <div className="identity-tags">
                {user?.role !== 'USER' && (
                  <span className="tag role-tag">
                    {displayRole}
                  </span>
                )}
                {alumni?.dut_verified === '是' && (
                  <span className="tag verified-tag">
                    ✓ 大工人认证
                  </span>
                )}
                {alumni?.association_role && (
                  <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px' }}>
                    {alumni.association_role.split(',').map((r: string) => r.trim()).filter(Boolean).map((role: string) => (
                      <span key={role} className="tag association-tag">
                        职务: {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {user?.role !== 'ADMIN' && (
                <div className="completion-container" style={{ marginTop: '16px' }}>
                  <div className="completion-label">
                    <span>资料完善度</span>
                    <span className={`completion-percentage ${eligibility.eligible ? 'success' : 'warning'}`}>{completion}%</span>
                  </div>
                  <div className="completion-bar-bg">
                    <div className="completion-bar-fill" style={{ width: `${completion}%`, backgroundColor: (eligibility.eligible || (alumni?.association_role && alumni?.association_role !== '普通校友')) ? '#10b981' : '#f59e0b' }}></div>
                  </div>
                  {!eligibility.eligible && (
                    <div className="completion-hint" style={{ color: '#f59e0b', fontWeight: 500 }}>
                      {alumni?.association_role && alumni?.association_role !== '普通校友' ? '💡' : '⚠️'} {eligibility.reason}
                      {alumni?.association_role && alumni?.association_role !== '普通校友' && '（已获理事会员权限，申请不受限）'}
                    </div>
                  )}
                  {eligibility.eligible && !(alumni?.association_role && alumni?.association_role !== '普通校友') && (
                    <div className="completion-hint" style={{ color: '#10b981' }}>✅ 已达到申请对接标准</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-nav-tabs">
          {user?.role !== 'ADMIN' && (
            <button className={`nav-tab ${currentView === 'info' ? 'active' : ''}`} onClick={() => setCurrentView('info')}>详细资料</button>
          )}
          <button className={`nav-tab ${currentView === 'requests' ? 'active' : ''}`} onClick={() => { setCurrentView('requests'); fetchRequests(); }}>
            {user?.role === 'ADMIN' ? '审批日志' : (
              <span className="tab-label-with-badge">
                对接申请
                {contactRequests.incoming.filter((r: any) => r.status === 'PENDING').length > 0 && (
                  <span className="tab-badge-mini">{contactRequests.incoming.filter((r: any) => r.status === 'PENDING').length}</span>
                )}
              </span>
            )}
          </button>
          {user?.role !== 'ADMIN' && (
            <>
              <button className={`nav-tab ${currentView === 'resume' ? 'active' : ''}`} onClick={() => setCurrentView('resume')}>我的简历</button>
              <button className={`nav-tab ${currentView === 'my-jobs' ? 'active' : ''}`} onClick={() => setCurrentView('my-jobs')}>我的招聘</button>
              <button className={`nav-tab ${currentView === 'my-applications' ? 'active' : ''}`} onClick={() => setCurrentView('my-applications')}>我的投递</button>
            </>
          )}
          <button className={`nav-tab ${currentView === 'password' ? 'active' : ''}`} onClick={() => setCurrentView('password')}>安全设置</button>
        </div>

        <div className="profile-content-area">
          {currentView === 'info' && (
            <div className="info-view animate-fade-in">
              {user?.hasIncompleteProfile && (
                <div style={{
                  marginBottom: '20px', padding: '14px 20px', background: '#fef2f2',
                  borderRadius: '16px', border: '1px solid #fca5a5', color: '#991b1b',
                  fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
                }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <div>
                    您的个人信息尚未完善：请在下方【在校经历】中为每一阶段选择“是否对外展示”（必选项：是 或 否）并保存。
                  </div>
                </div>
              )}
              <div className="view-title-row">
                <h2>📄 个人详细资料</h2>
              </div>
              {alumni ? (
                <AlumniForm 
                  initial={alumni} 
                  inline={true} 
                  onSaved={() => {
                    fetchData();
                    alert('资料已更新');
                  }} 
                />
              ) : (
                <div className="admin-notice">
                  <p>您当前以管理员身份登录，没有关联的校友档案。</p>
                </div>
              )}
            </div>
          )}

          {currentView === 'password' && (
            <div className="password-view animate-fade-in">
              <div className="view-title-row">
                <h2>🔐 修改登录密码</h2>
              </div>
              <div className="password-card">
                <form onSubmit={handlePasswordChange} className="password-form">
                  <div className="form-group">
                    <label>原密码</label>
                    <input 
                      type="password" 
                      value={passwordForm.old} 
                      onChange={e => setPasswordForm({...passwordForm, old: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>新密码</label>
                    <input 
                      type="password" 
                      value={passwordForm.new} 
                      onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>确认新密码</label>
                    <input 
                      type="password" 
                      value={passwordForm.confirm} 
                      onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                      required 
                    />
                  </div>
                  {passError && <div className="error-text">{passError}</div>}
                  {passSuccess && <div className="success-text">{passSuccess}</div>}
                  <button type="submit" className="save-btn">确认修改</button>
                </form>
              </div>
            </div>
          )}

          {currentView === 'requests' && (
            <div className="requests-view animate-fade-in">
              {user?.role !== 'ADMIN' && (
                <div className="view-title-row">
                  <h2>🤝 对接申请管理</h2>
                </div>
              )}
              
              {user?.role === 'ADMIN' ? (
                auditLogs.length === 0 ? (
                  <div className="empty-requests">
                    <p>暂无审批记录</p>
                  </div>
                ) : (
                  <div className="audit-log-list">
                    {auditLogs.map((log: any) => (
                      <div key={`${log.type}-${log.id}`} className="audit-log-item-single">
                        <div className="log-left">
                          <div className="log-type-tag-compact">
                            {log.type === 'MEMBER' && <span className="type-pill-mini member">注册</span>}
                            {log.type === 'CONTACT' && <span className="type-pill-mini contact">对接</span>}
                            {log.type === 'CORRECTION' && <span className="type-pill-mini correction">纠正</span>}
                          </div>
                          <div className="log-content-main">
                            {log.requester_name ? (
                              <>
                                <span className="log-user requester">{log.requester_name}</span>
                                <span className="log-arrow">→</span>
                                <span className="log-user target">{log.target_name}</span>
                              </>
                            ) : (
                              <span className="log-user target">{log.target_name}</span>
                            )}
                            {log.remark && <span className="log-remark-inline">({log.remark})</span>}
                          </div>
                        </div>
                        <div className="log-right">
                          <div className="log-processor-meta">
                            {log.processor_name && (
                              <span className={`log-processor-badge ${log.processor_id === log.target_alumni_id ? 'self' : 'admin'}`}>
                                {log.processor_id === log.target_alumni_id ? '校友自主审批' : `由 ${log.processor_name} 审批`}
                              </span>
                            )}
                          </div>
                          <div className="log-status-time">
                            <span className={`status-pill-mini ${log.status.toLowerCase()}`}>
                              {log.status === 'APPROVED' ? '已通过' : '已拒绝'}
                            </span>
                            <span className="log-time-mini">{formatDateTime(log.updated_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="dual-request-columns">
                  {/* Outgoing Requests */}
                  <div className="request-column">
                    <div className="column-header">
                      <h3>📤 我发出的申请 ({contactRequests.outgoing.length})</h3>
                    </div>
                    {contactRequests.outgoing.length === 0 ? (
                      <div className="empty-requests-inline">暂无发出的申请</div>
                    ) : (
                      <div className="request-list-compact">
                        {contactRequests.outgoing.map((req: any) => (
                          <div key={req.id} className={`request-item-compact ${req.status.toLowerCase()}`}>
                            <div className="req-header-compact">
                              <Link href={`/alumni/${req.target_alumni_id}`} className="target-link">
                                {req.target_name} 🔗
                              </Link>
                              <span className={`status-pill-mini ${req.status.toLowerCase()}`}>
                                {req.status === 'PENDING' ? '待审核' : req.status === 'APPROVED' ? '已通过' : '已拒绝'}
                              </span>
                            </div>
                            <div className="req-body-compact">
                              <div className="reason-text-compact">理由: {req.reason}</div>
                              {req.status === 'APPROVED' && (
                                <div className="contact-reveal-compact">
                                  <div>📞 {req.target_phone}</div>
                                  <div>💬 {req.target_wechat_group || '—'}</div>
                                </div>
                              )}
                            </div>
                            <div className="req-time-compact">{formatDateTime(req.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Incoming Requests */}
                  <div className="request-column">
                    <div className="column-header">
                      <h3>📥 我收到的申请 ({contactRequests.incoming.length})</h3>
                    </div>
                    {contactRequests.incoming.length === 0 ? (
                      <div className="empty-requests-inline">暂无收到的申请</div>
                    ) : (
                      <div className="request-list-compact">
                        {contactRequests.incoming.map((req: any) => (
                          <div key={req.id} className={`request-item-compact ${req.status.toLowerCase()}`}>
                            <div className="req-header-compact">
                              <Link href={`/alumni/${req.requester_alumni_id}`} className="target-link">
                                {req.requester_name} 🔗
                              </Link>
                              <div className="req-status-actions">
                                {req.status === 'PENDING' ? (
                                  <div className="action-buttons-mini">
                                    <button className="btn-approve-mini" onClick={() => handleRequestAction(req.id, 'APPROVED')}>通过</button>
                                    <button className="btn-reject-mini" onClick={() => handleRequestAction(req.id, 'REJECTED')}>拒绝</button>
                                  </div>
                                ) : (
                                  <span className={`status-pill-mini ${req.status.toLowerCase()}`}>
                                    {req.status === 'APPROVED' ? '已通过' : '已拒绝'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="req-body-compact">
                              <div className="reason-text-compact">理由: {req.reason}</div>
                            </div>
                            <div className="req-time-compact">{formatDateTime(req.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resume Tab */}
          {currentView === 'resume' && user?.role !== 'ADMIN' && (
            <div className="animate-fade-in">
              <div className="view-title-row"><h2>📄 我的简历</h2></div>

              <section style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>🎓 教育经历 <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>（与主档案同步）</span></h3>
                {alumni?.experiences?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {alumni.experiences.map((exp: any, i: number) => (
                      <div key={i} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#374151' }}>
                        <span style={{ fontWeight: 600 }}>{exp.stage}</span>
                        {(exp.start_year || exp.end_year) && <span style={{ color: '#64748b', marginLeft: '8px' }}>{exp.start_year}—{exp.end_year || '至今'}</span>}
                        {exp.college && <span style={{ marginLeft: '8px' }}>· {exp.college}</span>}
                        {exp.major && <span style={{ marginLeft: '8px' }}>· {exp.major}</span>}
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: '#94a3b8', fontSize: '14px' }}>暂无教育经历记录</div>}
              </section>

              <section style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', margin: 0 }}>💼 工作经历</h3>
                  <button onClick={() => { setEditingWork(null); setWorkForm({ company: '', position: '', location: '', start_year: '', end_year: '', is_current: false, description: '' }); setShowWorkForm(true); }}
                    style={{ padding: '6px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 添加</button>
                </div>
                {alumni?.company && (
                  <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '8px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><span style={{ fontWeight: 600, color: '#1e40af' }}>{alumni.company}</span>{alumni.position && <span style={{ color: '#3b82f6', marginLeft: '10px' }}>{alumni.position}</span>}</div>
                    <span style={{ fontSize: '11px', color: '#60a5fa', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>当前 · 同步自主档案</span>
                  </div>
                )}
                {workExperiences.map((exp: any) => (
                  <div key={exp.id} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{exp.company} <span style={{ fontWeight: 400, color: '#475569', marginLeft: '8px' }}>{exp.position}</span></div>
                        <div style={{ color: '#64748b', fontSize: '13px', marginTop: '3px' }}>{exp.start_year} — {exp.is_current ? '至今' : (exp.end_year || '')}{exp.location && ` · ${exp.location}`}</div>
                        {exp.description && <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{exp.description}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                        <button onClick={() => { setEditingWork(exp); setWorkForm({ company: exp.company, position: exp.position, location: exp.location || '', start_year: exp.start_year, end_year: exp.end_year || '', is_current: !!exp.is_current, description: exp.description || '' }); setShowWorkForm(true); }}
                          style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#475569' }}>编辑</button>
                        <button onClick={() => handleDeleteWork(exp.id)}
                          style={{ padding: '4px 10px', border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#ef4444' }}>删除</button>
                      </div>
                    </div>
                  </div>
                ))}
                {workExperiences.length === 0 && !alumni?.company && (
                  <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>暂无工作经历，点击「添加」开始维护</div>
                )}
              </section>

              {showWorkForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0' }}>{editingWork ? '编辑工作经历' : '添加工作经历'}</h3>
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {[['工作单位 *', 'company', 'text'], ['职务 *', 'position', 'text'], ['工作地点', 'location', 'text']].map(([label, key, type]) => (
                        <div key={key}><label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>{label}</label>
                          <input type={type as string} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }}
                            value={(workForm as any)[key]} onChange={e => setWorkForm(p => ({ ...p, [key]: e.target.value }))} /></div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>起始年月 *</label>
                          <input type="month" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }} value={workForm.start_year} onChange={e => setWorkForm(p => ({ ...p, start_year: e.target.value }))} /></div>
                        <div><label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>结束年月</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {!workForm.is_current && <input type="month" style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }} value={workForm.end_year} onChange={e => setWorkForm(p => ({ ...p, end_year: e.target.value }))} />}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}><input type="checkbox" checked={workForm.is_current} onChange={e => setWorkForm(p => ({ ...p, is_current: e.target.checked, end_year: '' }))} /> 至今</label>
                          </div></div>
                      </div>
                      <div><label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>工作描述</label>
                        <textarea style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any, resize: 'vertical', minHeight: '72px' }} value={workForm.description} onChange={e => setWorkForm(p => ({ ...p, description: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button onClick={() => { setShowWorkForm(false); setEditingWork(null); }} style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>取消</button>
                      <button onClick={handleSaveWork} style={{ padding: '9px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer' }}>保存</button>
                    </div>
                  </div>
                </div>
              )}

              <section>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>🛠️ 职业技能</h3>
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>技能标签</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {(() => { try { return (JSON.parse(skills.skill_tags || '[]') as string[]).map((tag: string) => (
                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                          {tag} <button onClick={() => removeSkillTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: '14px', padding: 0 }}>×</button>
                        </span>
                      )); } catch { return null; } })()}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input placeholder="输入技能后按回车添加" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillTag(skillInput); }}} style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                      <button onClick={() => addSkillTag(skillInput)} style={{ padding: '8px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>添加</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>自我介绍 <span style={{ color: '#94a3b8', fontWeight: 400 }}>（≤500字，投递时展示给招聘方）</span></label>
                    <textarea value={skills.bio} onChange={e => setSkills(prev => ({ ...prev, bio: e.target.value.slice(0, 500) }))} placeholder="简单介绍一下自己的背景、专长和求职意向..." rows={4} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' as any }} />
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>{skills.bio?.length || 0}/500</div>
                  </div>
                  <button onClick={handleSaveSkills} disabled={savingSkills} style={{ padding: '9px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: savingSkills ? 0.7 : 1 }}>
                    {savingSkills ? '保存中...' : '💾 保存技能信息'}
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* My Jobs Tab */}
          {currentView === 'my-jobs' && user?.role !== 'ADMIN' && (
            <div className="animate-fade-in">
              <div className="view-title-row" style={{ marginBottom: '20px' }}>
                <h2>📋 我发布的招聘</h2>
                <a href="/jobs/post" style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>+ 发布岗位</a>
              </div>
              {myJobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>暂未发布过招聘岗位</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myJobs.map((job: any) => {
                    const isActive = job.status === 'ACTIVE';
                    const statusColor = isActive ? '#10b981' : job.status === 'WITHDRAWN' ? '#94a3b8' : '#f59e0b';
                    const statusLabel = isActive ? '招募中' : job.status === 'WITHDRAWN' ? '已撤回' : '已到期';
                    return (
                      <div key={job.id} style={{ padding: '16px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700 }}>{job.job_title}</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: statusColor + '20', color: statusColor }}>{statusLabel}</span>
                              {job.unread_count > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: '#fee2e2', color: '#dc2626' }}>🔔 {job.unread_count} 条新投递</span>}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>{job.company_name} · {job.location} · 截止 {job.deadline}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>共 {job.application_count} 份投递</div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {job.application_count > 0 && (
                              <button onClick={async () => {
                                const res = await fetch(`/api/jobs/${job.id}/applications`);
                                if (res.ok) { const apps = await res.json(); setSelectedJobApps({ jobId: job.id, apps }); window.dispatchEvent(new Event('unreadCountUpdate')); fetchMyJobs(); }
                              }} style={{ padding: '5px 12px', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>📥 查看投递</button>
                            )}
                            <a href={`/jobs/${job.id}`} style={{ padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', fontWeight: 600, textDecoration: 'none' }}>详情</a>
                            {isActive && <button onClick={() => handleJobAction(job.id, 'WITHDRAWN')} style={{ padding: '5px 12px', border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#ef4444', fontWeight: 600 }}>撤回</button>}
                            {!isActive && <button onClick={() => handleJobAction(job.id, 'ACTIVE')} style={{ padding: '5px 12px', border: '1px solid #d1fae5', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#10b981', fontWeight: 600 }}>重新发布</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedJobApps && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '660px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>📥 收到的投递（{selectedJobApps.apps.length} 份）</h3>
                      <button onClick={() => setSelectedJobApps(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                    </div>
                    {selectedJobApps.apps.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>暂无投递</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {selectedJobApps.apps.map((app: any) => (
                          <div key={app.id} style={{ padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <a
                                  href={`/alumni/${app.applicant_alumni_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', textDecoration: 'none', transition: 'color 0.2s' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#1e293b')}
                                  title="点击进入校友个人详情页"
                                >
                                  {app.applicant_name} ↗
                                </a>
                                <span style={{ fontSize: '13px' }}>{app.gender === '男' ? '👨' : app.gender === '女' ? '👩' : ''}</span>
                                <button
                                  onClick={() => handleOpenApplicantResume(app.applicant_alumni_id)}
                                  style={{ padding: '2px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  📄 查看简历
                                </button>
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{app.created_at?.substring(0, 10)}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                              <div>🎓 {app.college || '—'} {app.degree || ''}</div>
                              <div>🏢 {app.company || '—'}{app.position ? ` · ${app.position}` : ''}</div>
                              <div>📞 {app.phone || '—'}</div>
                              <div>💬 微信：{app.wechat_id || '—'}</div>
                            </div>
                            {app.bio_snapshot && (
                              <div style={{ padding: '10px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                                <strong>求职说明：</strong>{app.bio_snapshot}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Applicant Resume Detail Modal */}
              {viewingResume && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
                  <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{viewingResume.name}</h2>
                          {viewingResume.gender && <span style={{ fontSize: '14px', color: '#64748b' }}>({viewingResume.gender})</span>}
                          {viewingResume.dut_verified === '是' && <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>✓ 大工人认证</span>}
                        </div>
                        <div style={{ fontSize: '14px', color: '#475569', marginTop: '6px' }}>
                          {viewingResume.company ? `🏢 ${viewingResume.company}` : ''} {viewingResume.position ? ` · ${viewingResume.position}` : ''} {viewingResume.region ? `📍 ${viewingResume.region}` : ''}
                        </div>
                      </div>
                      <button onClick={() => setViewingResume(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '100px', width: '32px', height: '32px', fontSize: '18px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>

                    {/* Contact Card */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '24px', fontSize: '14px', color: '#374151' }}>
                      <div>📞 电话：<strong>{viewingResume.phone || '—'}</strong></div>
                      <div>💬 微信：<strong>{viewingResume.wechat_id || '—'}</strong></div>
                      <div>✉️ QQ/邮箱：<strong>{viewingResume.qq || '—'}</strong></div>
                      <div>📍 籍贯：<strong>{viewingResume.hometown || '—'}</strong></div>
                    </div>

                    {/* Education History */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>🎓 教育背景</h3>
                      {viewingResume.experiences?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {viewingResume.experiences.map((exp: any, i: number) => (
                            <div key={i} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155' }}>
                              <span style={{ fontWeight: 700 }}>{exp.stage}</span>
                              {(exp.start_year || exp.end_year) && <span style={{ color: '#64748b', marginLeft: '8px' }}>{exp.start_year}—{exp.end_year || '至今'}</span>}
                              {exp.college && <span style={{ marginLeft: '8px' }}>· {exp.college}</span>}
                              {exp.major && <span style={{ marginLeft: '8px' }}>· {exp.major}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>未填写详细教育背景</div>
                      )}
                    </div>

                    {/* Work Experiences */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>💼 工作经历</h3>
                      {viewingResume.work_experiences?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {viewingResume.work_experiences.map((work: any) => (
                            <div key={work.id} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{work.company}</span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{work.start_year} — {work.is_current ? '至今' : (work.end_year || '')}</span>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>{work.position} {work.location ? `· ${work.location}` : ''}</div>
                              {work.description && <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginTop: '6px', whiteSpace: 'pre-wrap' }}>{work.description}</div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>未添加独立工作经历</div>
                      )}
                    </div>

                    {/* Skills & Bio */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>🛠️ 技能 & 自我介绍</h3>
                      <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0' }}>
                        {(() => {
                          try {
                            const tags = JSON.parse(viewingResume.resume_skills?.skill_tags || '[]');
                            return tags.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                {tags.map((tag: string) => (
                                  <span key={tag} style={{ padding: '3px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{tag}</span>
                                ))}
                              </div>
                            ) : null;
                          } catch { return null; }
                        })()}
                        {viewingResume.resume_skills?.bio ? (
                          <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {viewingResume.resume_skills.bio}
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>暂未填写自我介绍</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                      <a href={`/alumni/${viewingResume.id}`} target="_blank" style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                        👤 查看校友完整主页 ↗
                      </a>
                      <button onClick={() => setViewingResume(null)} style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                        关闭
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* My Applications Tab */}
          {currentView === 'my-applications' && user?.role !== 'ADMIN' && (
            <div className="animate-fade-in">
              <div className="view-title-row"><h2>📤 我的投递</h2></div>
              {myApplications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>还未投递过任何岗位</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myApplications.map((app: any) => (
                    <div key={app.id} style={{ padding: '16px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '3px' }}>{app.job_title}</div>
                        <div style={{ fontSize: '13px', color: '#475569' }}>{app.company_name} · {app.location}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>投递于 {app.created_at?.substring(0, 10)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: app.status === 'SUBMITTED' ? '#d1fae5' : '#f1f5f9', color: app.status === 'SUBMITTED' ? '#065f46' : '#64748b' }}>
                          {app.status === 'SUBMITTED' ? '已投递' : '已撤回'}
                        </span>
                        <a href={`/jobs/${app.job_id}`} style={{ padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', fontWeight: 600, textDecoration: 'none' }}>查看岗位</a>
                        {app.status === 'SUBMITTED' && (
                          <button onClick={() => handleWithdrawApplication(app.id)} style={{ padding: '5px 12px', border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#ef4444', fontWeight: 600 }}>撤回</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .profile-page { 
          padding: 40px 20px; 
          min-height: 100vh;
        }
        .profile-container {
          max-width: 900px;
          margin: 0 auto;
        }
        
        /* Header Styling */
        .user-profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 30px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
          margin-bottom: 30px;
        }
        .header-main {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .user-avatar-large {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        .user-identity h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .identity-tags {
          display: flex;
          gap: 10px;
        }
        .tag {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .role-tag {
          background: #f1f5f9;
          color: #475569;
        }
        .association-tag {
          background: #eff6ff;
          color: #2563eb;
        }
        .verified-tag {
          background: #fff7ed;
          color: #ea580c;
          border: 1px solid #ffedd5;
        }
        
        /* Completion Bar */
        .completion-container {
          width: 100%;
          max-width: 300px;
        }
        .completion-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .completion-label span:first-child {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        .completion-percentage {
          font-size: 12px;
          font-weight: 700;
        }
        .completion-percentage.success { color: #10b981; }
        .completion-percentage.warning { color: #f59e0b; }
        
        .completion-bar-bg {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }
        .completion-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 3px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .completion-hint {
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
        }

        .profile-nav-tabs {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 10px;
        }
        .nav-tab {
          padding: 12px 4px;
          background: none;
          border: none;
          color: #64748b;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .tab-label-with-badge { position: relative; display: inline-block; }
        .tab-badge-mini {
          position: absolute;
          top: -10px;
          right: -15px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
          border: 1.5px solid white;
          pointer-events: none;
        }
        .nav-tab:hover { color: #1e293b; }
        .nav-tab.active { color: #2563eb; }
        .nav-tab.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #2563eb;
        }

        /* Content Area */
        .profile-content-area {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 40px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.03);
        }
        
        .view-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .view-title-row h2 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
        }

        .password-card {
          max-width: 450px;
          margin: 0 auto;
        }
        
        .form-group { margin-bottom: 24px; }
        label { display: block; font-size: 14px; color: #475569; margin-bottom: 8px; font-weight: 500; }
        input { 
          width: 100%; padding: 12px; background: #fff; border: 1px solid #e2e8f0; 
          border-radius: 12px; color: #1e293b; font-size: 15px; transition: all 0.2s;
        }
        input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        
        .save-btn {
          width: 100%; padding: 14px; background: #3b82f6; border: none; border-radius: 12px;
          color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
        .save-btn:hover { background: #2563eb; transform: translateY(-1px); }
        
        .error-text { color: #dc2626; font-size: 13px; margin-bottom: 16px; background: #fef2f2; padding: 10px; border-radius: 8px; }
        .success-text { color: #059669; font-size: 13px; margin-bottom: 16px; background: #ecfdf5; padding: 10px; border-radius: 8px; }
        
        .admin-notice {
          padding: 40px;
          text-align: center;
          color: #64748b;
          font-style: italic;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        .audit-log-item-single {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        .audit-log-item-single:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .log-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
        .log-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .log-status-time { display: flex; align-items: center; gap: 12px; }
        
        .log-processor-badge { 
          font-size: 10px; 
          padding: 1px 6px; 
          border-radius: 4px; 
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        .log-processor-badge.self { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
        .log-processor-badge.admin { background: #e0f2fe; color: #075985; border-color: #bae6fd; }

        .log-type-tag-compact { min-width: 40px; }
        .type-pill-mini {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          color: white;
          font-weight: 700;
        }
        .type-pill-mini.member { background: #3b82f6; }
        .type-pill-mini.contact { background: #10b981; }
        .type-pill-mini.correction { background: #f59e0b; }
        
        .log-content-main { 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          font-size: 14px; 
          color: #1e293b; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
        }
        .log-user { font-weight: 600; }
        .log-user.requester { color: #475569; }
        .log-user.target { color: #2563eb; }
        .log-arrow { color: #94a3b8; font-family: monospace; }
        .log-remark-inline { color: #64748b; font-size: 12px; font-style: italic; }
        
        .status-pill-mini {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 100px;
        }
        .status-pill-mini.approved { background: #d1fae5; color: #065f46; }
        .status-pill-mini.rejected { background: #fee2e2; color: #991b1b; }
        
        .log-time-mini { font-size: 11px; color: #94a3b8; }
        
        .dual-request-columns {
          display: flex;
          gap: 30px;
        }
        .request-column {
          flex: 1;
          min-width: 0;
        }
        .column-header h3 {
          font-size: 15px;
          color: #475569;
          margin-bottom: 20px;
          font-weight: 700;
        }
        .request-list-compact {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .request-item-compact {
          padding: 15px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .request-item-compact:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          border-color: #cbd5e1;
        }
        .request-item-compact.approved { border-left: 4px solid #10b981; }
        .request-item-compact.rejected { border-left: 4px solid #ef4444; }
        .request-item-compact.pending { border-left: 4px solid #f59e0b; }
        
        .req-header-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .action-buttons-mini { display: flex; gap: 6px; }
        .btn-approve-mini, .btn-reject-mini {
          padding: 4px 10px; border-radius: 6px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-approve-mini { background: #10b981; color: white; }
        .btn-approve-mini:hover { background: #059669; transform: translateY(-1px); }
        .btn-reject-mini { background: #ef4444; color: white; }
        .btn-reject-mini:hover { background: #dc2626; transform: translateY(-1px); }
        .target-link {
          font-weight: 700;
          color: #1a56db;
          font-size: 14px;
        }
        .target-link:hover { text-decoration: underline; }
        
        .req-body-compact { margin-bottom: 8px; }
        .reason-text-compact { font-size: 13px; color: #475569; line-height: 1.5; }
        .contact-reveal-compact {
          margin-top: 10px;
          padding: 10px;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #d1fae5;
          font-size: 13px;
          color: #065f46;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .req-time-compact { font-size: 11px; color: #94a3b8; text-align: right; }
        .empty-requests-inline {
          padding: 30px;
          text-align: center;
          color: #94a3b8;
          font-style: italic;
          font-size: 13px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px dashed #cbd5e1;
        }
        
        @media (max-width: 768px) {
          .dual-request-columns { flex-direction: column; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading { padding: 100px; text-align: center; color: #64748b; font-size: 14px; }
        
        @media (max-width: 640px) {
          .user-profile-header { flex-direction: column; gap: 20px; align-items: flex-start; }
          .profile-content-area { padding: 20px; }
          .audit-log-item-single { flex-direction: column; align-items: flex-start; gap: 8px; }
          .log-right { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </div>
  );
}
