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
  const [currentView, setCurrentView] = useState<'info' | 'password' | 'requests'>('info');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const router = useRouter();

  const [contactRequests, setContactRequests] = useState<{ outgoing: any[], incoming: any[] }>({ outgoing: [], incoming: [] });
  
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
    fetchData();
  }, []);

  useEffect(() => {
    if (currentView === 'requests' && user?.role !== 'ADMIN') {
      fetch('/api/notifications/mark-read', { method: 'POST' })
        .then(() => {
          window.dispatchEvent(new Event('unreadCountUpdate'));
        });
    }
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
                  <span className="tag association-tag">
                    职务: {alumni.association_role}
                  </span>
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
          <button className={`nav-tab ${currentView === 'password' ? 'active' : ''}`} onClick={() => setCurrentView('password')}>安全设置</button>
        </div>

        <div className="profile-content-area">
          {currentView === 'info' ? (
            <div className="info-view animate-fade-in">
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
          ) : currentView === 'password' ? (
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
          ) : (
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
