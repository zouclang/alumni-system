'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AlumniForm from '@/components/AlumniForm';

export default function PermissionsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'REGISTRATION' | 'CONTACT' | 'CORRECTION'>('REGISTRATION');
  const [contactRequests, setContactRequests] = useState<any[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<any[]>([]);
  const [rejectingRequest, setRejectingRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ registration: 0, contact: 0, correction: 0 });

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!hasAutoSwitched && loading === false) {
      const pendingUsersCount = users.filter(u => u.status === 'PENDING' && u.role !== 'ADMIN').length;
      if (pendingUsersCount === 0) {
        if (contactRequests.length > 0) {
          setActiveTab('CONTACT');
          setHasAutoSwitched(true);
        } else if (correctionRequests.length > 0) {
          setActiveTab('CORRECTION');
          setHasAutoSwitched(true);
        }
      } else {
        setHasAutoSwitched(true); // Don't switch if we have registrations
      }
    }
  }, [users, contactRequests, correctionRequests, loading, hasAutoSwitched]);

  // Refetch active tab if it's not the initial load or user manually switched
  useEffect(() => {
    if (activeTab === 'CONTACT' && contactRequests.length === 0 && !loading) fetchContactRequests();
    if (activeTab === 'CORRECTION' && correctionRequests.length === 0 && !loading) fetchCorrectionRequests();
  }, [activeTab]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(true),
      fetchContactRequests(true),
      fetchCorrectionRequests(true),
      fetchPendingCounts()
    ]);
    setLoading(false);
  };

  const fetchPendingCounts = async () => {
    try {
      const res = await fetch(`/api/admin/users/pending-count?detail=1&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPendingCounts({
          registration: data.registration || 0,
          contact: data.contact || 0,
          correction: data.correction || 0
        });
        // Dispatch event for sidebar to update
        window.dispatchEvent(new Event('pendingCountUpdate'));
      }
    } catch (err) {}
  };

  const fetchUsers = async (skipLoading = false) => {
    if (!skipLoading) setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?status=PENDING&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('无法加载用户列表');
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  const fetchContactRequests = async (skipLoading = false) => {
    try {
      const res = await fetch(`/api/contact-requests?status=PENDING&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContactRequests(data);
    } catch (err) {
      setError('无法加载对接申请');
    }
  };

  const fetchCorrectionRequests = async (skipLoading = false) => {
    try {
      const res = await fetch(`/api/corrections?status=PENDING&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCorrectionRequests(data);
    } catch (err) {
      setError('无法加载纠正申请');
    }
  };

  const handleStatusUpdate = async (userId: number, status: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      });
      if (res.ok) {
        // 1. Optimistic update: remove the user from local list immediately
        setUsers(prev => prev.filter(u => u.id !== userId));
        
        // 2. Optimistically update local counts for the tabs
        setPendingCounts(prev => ({
          ...prev,
          registration: Math.max(0, prev.registration - 1)
        }));
        
        // 3. Dispatch event for sidebar - Sidebar will fetch fresh data
        // Small delay to ensure DB write is fully visible to subsequent API calls
        setTimeout(() => {
          fetchUsers(true);
          fetchPendingCounts();
        }, 300);
      }
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleContactAudit = async (requestId: number, status: string, remark?: string) => {
    try {
      const res = await fetch(`/api/contact-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminRemark: remark }),
      });
      if (res.ok) {
        // 1. Optimistic update
        setContactRequests(prev => prev.filter(req => req.id !== requestId));
        
        // 2. Optimistic count update
        setPendingCounts(prev => ({
          ...prev,
          contact: Math.max(0, prev.contact - 1)
        }));
        
        // 3. Delayed background sync to avoid race conditions with DB
        setTimeout(() => {
          fetchContactRequests(true);
          fetchPendingCounts();
        }, 300);
        
        setRejectingRequest(null);
        setRejectReason('');
      } else {
        alert('审核失败');
      }
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleCorrectionAudit = async (requestId: number, status: string, remark?: string) => {
    try {
      const res = await fetch(`/api/corrections/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminRemark: remark }),
      });
      if (res.ok) {
        // 1. Optimistic update
        setCorrectionRequests(prev => prev.filter(req => req.id !== requestId));
        
        // 2. Optimistic count update
        setPendingCounts(prev => ({
          ...prev,
          correction: Math.max(0, prev.correction - 1)
        }));
        
        // 3. Delayed background sync
        setTimeout(() => {
          fetchCorrectionRequests(true);
          fetchPendingCounts();
        }, 300);
        
        setRejectingRequest(null);
        setRejectReason('');
      } else {
        alert('审核失败');
      }
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleRemoveCouncil = async (userId: number) => {
    if (!confirm('确定移除该理事会员权限吗？这也会清除其校友记录中的职务信息。')) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, removeCouncil: true }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      alert('操作失败');
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING' && u.role !== 'ADMIN');
  
  return (
    <div className="permissions-page">
      <div className="page-header">
        <div>
          <h1>🔐 审核管理</h1>
          <p>管理校友注册申请、对接需求、资料纠正及成员权限</p>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'REGISTRATION' ? 'active' : ''}`}
          onClick={() => setActiveTab('REGISTRATION')}
        >
          <span>注册审核</span>
          <span className="count-badge">{pendingCounts.registration}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'CONTACT' ? 'active' : ''}`}
          onClick={() => setActiveTab('CONTACT')}
        >
          <span>对接审核</span>
          <span className="count-badge">{pendingCounts.contact}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'CORRECTION' ? 'active' : ''}`}
          onClick={() => setActiveTab('CORRECTION')}
        >
          <span>信息纠正</span>
          <span className="count-badge">{pendingCounts.correction}</span>
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {activeTab === 'REGISTRATION' ? (
        <div className="section">
          <h2 className="section-title">待审核注册申请 ({pendingUsers.length})</h2>
          {pendingUsers.length === 0 ? (
            <p className="empty-msg">暂时没有待审核的注册请求</p>
          ) : (
            <div className="user-grid">
              {pendingUsers.map(u => (
                <div key={u.id} className="user-card pending">
                  <div className="user-info" style={{ flex: 1 }}>
                    <div className="user-main">
                      <span className="user-name-link" onClick={() => setSelectedUser(u)}>
                        {u.name || u.username}
                      </span>
                      <span className="status-badge pending">待审核</span>
                    </div>
                    <div className="user-sub">
                      {u.college || '未填写学院'} · {u.enrollment_year ? `${u.enrollment_year}级` : '未填写年级'}
                    </div>
                    <div className="user-time">申请时间: {new Date(u.created_at).toLocaleString()}</div>
                  </div>
                  <div className="user-actions">
                    <button onClick={() => handleStatusUpdate(u.id, 'APPROVED')} className="action-btn approve">批准</button>
                    <button onClick={() => handleStatusUpdate(u.id, 'REJECTED')} className="action-btn reject">拒绝</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'CONTACT' ? (
        <div className="section">
          <h2 className="section-title">待审核对接申请 ({contactRequests.length})</h2>
          {contactRequests.length === 0 ? (
            <p className="empty-msg">暂时没有待审核的对接申请</p>
          ) : (
            <div className="user-grid">
              {contactRequests.map(req => (
                <div key={req.id} className="user-card contact">
                  <div className="user-info" style={{ flex: 1 }}>
                    <div className="user-main" style={{ marginBottom: '8px' }}>
                      <span className="requester-name">
                        {req.requester_real_name || req.requester_username}
                      </span>
                      <span style={{ margin: '0 8px', color: '#94a3b8' }}>➔</span>
                      <span className="target-name" style={{ color: '#60a5fa', fontWeight: 700 }}>{req.target_name}</span>
                    </div>
                    <div className="reason-box">
                      <span className="reason-label">对接理由：</span>
                      {req.reason}
                    </div>
                    <div className="user-time" style={{ marginTop: '8px' }}>提交时间: {new Date(req.created_at).toLocaleString()}</div>
                  </div>
                  <div className="user-actions" style={{ marginLeft: '20px' }}>
                    <button onClick={() => handleContactAudit(req.id, 'APPROVED')} className="action-btn approve">通过</button>
                    <button onClick={() => setRejectingRequest(req)} className="action-btn reject">拒绝</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="section">
          <h2 className="section-title">待审核资料纠正 ({correctionRequests.length})</h2>
          {correctionRequests.length === 0 ? (
            <p className="empty-msg">暂时没有待审核的资料纠正申请</p>
          ) : (
            <div className="user-grid">
              {correctionRequests.map(req => (
                <div key={req.id} className="user-card correction">
                  <div className="user-info" style={{ flex: 1 }}>
                    <div className="user-main" style={{ marginBottom: '8px' }}>
                      <span className="requester-name">
                        {req.requester_real_name || req.requester_username}
                      </span>
                      <span style={{ margin: '0 8px', color: '#94a3b8' }}>纠正</span>
                      <span className="target-name" style={{ color: '#60a5fa', fontWeight: 700 }}>{req.target_name}</span>
                    </div>
                    <div className="reason-box">
                      <span className="reason-label">纠正内容：</span>
                      {req.content}
                    </div>
                    <div className="user-time" style={{ marginTop: '8px' }}>提交时间: {new Date(req.created_at).toLocaleString()}</div>
                  </div>
                  <div className="user-actions" style={{ marginLeft: '20px' }}>
                    <button onClick={() => handleCorrectionAudit(req.id, 'APPROVED')} className="action-btn approve">通过</button>
                    <button onClick={() => setRejectingRequest(req)} className="action-btn reject">拒绝</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">拒绝申请</h2>
              <button className="close-btn" onClick={() => setRejectingRequest(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
                请向 <strong>{rejectingRequest.requester_real_name || rejectingRequest.requester_username}</strong> 提供拒绝理由：
              </p>
              <textarea
                className="form-textarea"
                placeholder="请输入拒绝理由..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', minHeight: '100px', marginBottom: '20px', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => setRejectingRequest(null)}>取消</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (activeTab === 'CONTACT') handleContactAudit(rejectingRequest.id, 'REJECTED', rejectReason);
                    else if (activeTab === 'CORRECTION') handleCorrectionAudit(rejectingRequest.id, 'REJECTED', rejectReason);
                    else handleStatusUpdate(rejectingRequest.id, 'REJECTED');
                  }}
                  disabled={!rejectReason.trim()}
                >
                  确认拒绝
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <AlumniForm
          initial={{
            ...selectedUser,
            id: selectedUser.alumni_id || selectedUser.id,
            userId: selectedUser.id,
            status: selectedUser.status
          }}
          onClose={() => setSelectedUser(null)}
          onSaved={() => {
            fetchUsers();
          }}
          onApprove={selectedUser.status === 'PENDING' ? async () => {
            await handleStatusUpdate(selectedUser.id, 'APPROVED');
            setSelectedUser(null);
          } : undefined}
          onReject={selectedUser.status === 'PENDING' ? async () => {
             await handleStatusUpdate(selectedUser.id, 'REJECTED');
             setSelectedUser(null);
          } : undefined}
        />
      )}

      <style jsx>{`
        .permissions-page { 
          padding: 40px; 
          max-width: 1400px; 
          margin: 0 auto; 
          min-height: 100vh; 
          color: #f1f5f9;
          background: #0f172a;
          box-shadow: 0 0 100px rgba(0,0,0,0.5);
        }
        .page-header { margin-bottom: 40px; }
        .page-header h1 { font-size: 32px; font-weight: 800; color: #ffffff; margin-bottom: 8px; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .page-header p { color: #cbd5e1; font-size: 16px; }
        
        .tabs { 
          display: flex; 
          gap: 12px; 
          margin-bottom: 40px; 
          padding: 6px;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          width: fit-content;
        }
        .tab-btn { 
          padding: 10px 24px; 
          border-radius: 14px;
          border: none;
          background: transparent;
          color: #94a3b8; 
          font-size: 14px; 
          font-weight: 700; 
          cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tab-btn:hover { 
          color: #ffffff; 
          background: rgba(255, 255, 255, 0.05);
        }
        .tab-btn.active { 
          color: #ffffff; 
          background: #3b82f6;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        .count-badge {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
        }
        .tab-btn.active .count-badge {
          background: rgba(255, 255, 255, 0.25);
        }

        .section-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
        .user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; }
        .user-card { 
          background: rgba(30, 41, 59, 0.85);
          backdrop-filter: blur(12px);
          border-radius: 20px; 
          padding: 24px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .user-card:hover { transform: translateY(-4px); border-color: rgba(96, 165, 250, 0.5); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
        
        .reason-box { 
          background: rgba(0,0,0,0.2); 
          padding: 12px; 
          border-radius: 8px; 
          font-size: 14px; 
          color: #cbd5e1; 
          border: 1px solid rgba(255,255,255,0.05); 
          margin-top: 12px;
        }
        .reason-label { color: #94a3b8; font-size: 12px; display: block; margin-bottom: 4px; }
        
        .user-name-link { font-size: 18px; font-weight: 700; color: #60a5fa; cursor: pointer; transition: color 0.2s; }
        .user-name-link:hover { color: #93c5fd; text-decoration: underline; }
        .requester-name { font-size: 16px; font-weight: 700; color: #f8fafc; }
        .target-name { font-size: 16px; font-weight: 700; color: #60a5fa; }
        
        .status-badge { font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .status-badge.pending { background: rgba(245, 158, 11, 0.25); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
        .status-badge.rejected { background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
        
        .role-tag { font-size: 11px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.3); font-weight: 800; }
        
        .user-sub { color: #cbd5e1; font-size: 14px; margin-top: 4px; }
        .user-time { color: #94a3b8; font-size: 12px; margin-top: 8px; }
        
        .user-actions { display: flex; gap: 12px; }
        .action-btn { padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; }
        .approve { background: #10b981; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .approve:hover { background: #059669; transform: scale(1.05); }
        .reject { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .reject:hover { background: rgba(239, 68, 68, 0.25); }
        .remove { background: rgba(255,255,255,0.08); color: #cbd5e1; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { 
          background: rgba(30, 41, 59, 0.95); 
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px; 
          width: 90%; 
          overflow: hidden; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6); 
        }
        .modal-header { padding: 24px 30px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-size: 20px; font-weight: 800; color: #ffffff; }
        .close-btn { 
          background: none; 
          border: none; 
          color: #94a3b8; 
          cursor: pointer; 
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s; 
        }
        .close-btn:hover { 
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff; 
        }
        .modal-content p { color: #cbd5e1 !important; }
        .modal-content textarea { 
          background: rgba(15, 23, 42, 0.6) !important; 
          color: #ffffff !important; 
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .modal-content textarea:focus {
          border-color: #3b82f6 !important;
          background: rgba(15, 23, 42, 0.8) !important;
        }
        
        .empty-msg { 
          color: #cbd5e1; 
          font-style: italic; 
          font-size: 16px; 
          text-align: center; 
          padding: 60px 40px; 
          background: rgba(255,255,255,0.03); 
          border-radius: 24px; 
          border: 2px dashed rgba(255,255,255,0.1); 
          margin: 20px 0;
        }
        .error-msg { background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 18px; border-radius: 14px; margin-bottom: 24px; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 500; }
        .mt-40 { margin-top: 40px; }
        
        .btn { padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 14px; }
        .btn-primary { background: #3b82f6; color: white; border: none; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .btn-primary:hover { background: #2563eb; transform: translateY(-2px); }
        .btn-outline { 
          background: #ffffff !important; 
          color: #1e293b !important; 
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .btn-outline:hover { 
          background: #f1f5f9 !important; 
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
