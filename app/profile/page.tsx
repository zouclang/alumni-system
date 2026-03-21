'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

  const [contactRequests, setContactRequests] = useState<any[]>([]);

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
          <button className={`nav-tab ${currentView === 'requests' ? 'active' : ''}`} onClick={() => setCurrentView('requests')}>
            {user?.role === 'ADMIN' ? '审批日志' : '对接申请'}
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
                  <h2>🤝 我的对接申请</h2>
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
                          <span className={`status-pill-mini ${log.status.toLowerCase()}`}>
                            {log.status === 'APPROVED' ? '已通过' : '已拒绝'}
                          </span>
                          <span className="log-time-mini">{new Date(log.updated_at).toLocaleDateString()} {new Date(log.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : contactRequests.length === 0 ? (
                <div className="empty-requests">
                  <p>暂无对接申请记录</p>
                </div>
              ) : (
                <div className="request-list">
                  {contactRequests.map((req: any) => (
                    <div key={req.id} className={`request-item ${req.status.toLowerCase()}`}>
                      <div className="request-header">
                        <span className="target-name">对接校友: {req.target_name}</span>
                        <span className={`status-pill ${req.status.toLowerCase()}`}>
                          {req.status === 'PENDING' ? '待审核' : req.status === 'APPROVED' ? '已通过' : req.status === '拒绝' ? '已拒绝' : req.status}
                        </span>
                      </div>
                      <div className="request-body">
                        <div className="reason-text"><strong>申请理由:</strong> {req.reason}</div>
                        {req.status === 'APPROVED' && (
                          <div className="contact-reveal">
                            <div className="reveal-item">📞 电话: <strong>{req.phone}</strong></div>
                            <div className="reveal-item">💬 所在微信群: <strong>{req.wechat_groups || '—'}</strong></div>
                          </div>
                        )}
                        {req.status === 'REJECTED' && req.admin_remark && (
                          <div className="reject-remark">
                            <strong>拒绝理由:</strong> {req.admin_remark}
                          </div>
                        )}
                      </div>
                      <div className="request-time">提交于 {new Date(req.created_at).toLocaleString()}</div>
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
        .log-right { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
        
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
        
        .log-time-mini { font-size: 11px; color: #94a3b8; min-width: 110px; text-align: right; }
        
        .empty-requests {
          padding: 60px 0;
          text-align: center;
          color: #94a3b8;
        }

        .request-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .request-item {
          padding: 20px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .request-item.approved { border-left: 4px solid #10b981; background: #f0fdf4; }
        .request-item.rejected { border-left: 4px solid #ef4444; background: #fef2f2; }
        .request-item.pending { border-left: 4px solid #f59e0b; }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .target-name { font-weight: 700; color: #1e293b; font-size: 16px; }
        .status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
        }
        .status-pill.pending { background: #fef3c7; color: #92400e; }
        .status-pill.approved { background: #d1fae5; color: #065f46; }
        .status-pill.rejected { background: #fee2e2; color: #991b1b; }

        .request-body { margin-bottom: 12px; }
        .reason-text { font-size: 14px; color: #475569; line-height: 1.5; }
        .contact-reveal {
          margin-top: 15px;
          padding: 15px;
          background: white;
          border-radius: 12px;
          border: 1px solid #d1fae5;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .reveal-item { font-size: 14px; color: #065f46; }
        .reject-remark {
          margin-top: 12px;
          padding: 10px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 8px;
          font-size: 13px;
        }
        .request-time { font-size: 12px; color: #94a3b8; text-align: right; }

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
