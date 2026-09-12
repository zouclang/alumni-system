'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AlumniForm from '@/components/AlumniForm';
import MatchmakingDetailModal from '@/components/MatchmakingDetailModal';

// ─── Options ─────────────────────────────────────────────────────────────────
const REGION_OPTIONS = ['工业园区', '吴中区', '姑苏区', '高新区', '相城区', '吴江区', '昆山', '太仓', '常熟', '张家港'];
const MARITAL_OPTIONS = ['未婚', '离异未育', '离异带娃', '丧偶'];
const PROPERTY_OPTIONS = ['无房', '独立全款购房', '贷款购房', '与父母同住'];
const JOB_OPTIONS = ['体制内（公务员/事业编）', '央国企', '外企', '上市公司/科技大厂/大型民企', '普通民企', '创业或自由职业', '其他'];
const DEGREE_OPTIONS = ['大专', '本科', '硕士', '博士'];
const PARENTS_JOB_OPTIONS = ['退休', '体制内', '企业', '务农', '其他'];
const PARENTS_INS_OPTIONS = ['有健全养老与医疗保障', '暂无', '部分有'];
const FAMILY_STR_OPTIONS = ['独生子女', '多子女'];
const PARENTS_MARITAL_OPTIONS = ['在婚', '离异', '丧偶'];
const SMOKING_OPTIONS = ['不吸烟', '偶尔', '经常'];
const SMOKING_PREF_OPTIONS = ['不限', '不吸烟', '可接受偶尔'];
const DRINKING_OPTIONS = ['不喝酒', '偶尔小酌', '经常饮酒'];
const DRINKING_PREF_OPTIONS = ['不限', '不喝酒', '可接受偶尔'];
const SCHEDULE_OPTIONS = ['规律（早睡早起）', '基本规律', '不规律'];
const SCHEDULE_PREF_OPTIONS = ['不限', '规律', '基本规律即可'];
const HOBBIES_OPTIONS = ['旅行','摄影','跑步','游泳','阅读','烹饪','骑行','羽毛球','网球','徒步','露营','音乐','绘画','游戏','桌游','园艺','宠物','其他'];
const PERSONALITY_OPTIONS = ['开朗外向','温柔体贴','理性冷静','幽默风趣','独立自主','顾家','上进努力','细心周到','随和好说话','有责任心','文艺气质','浪漫','务实','直率坦诚','有主见'];

// ─── Types ───────────────────────────────────────────────────────────────────
type TabType = 'criteria' | 'mutual' | 'them' | 'me';

export const isFemaleGender = (g?: string) => g === 'F' || g === '女';
export const isMaleGender = (g?: string) => g === 'M' || g === '男';
export const genderLabel = (g?: string) => isFemaleGender(g) ? '女' : (isMaleGender(g) ? '男' : (g || '—'));
export const parseJ = (v: any): string[] => {
  if (!v) return [];
  try {
    const r = JSON.parse(v);
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function MatchmakingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mmStatus, setMmStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('criteria');

  // Profile & Criteria state
  const [profile, setProfile] = useState<any>({});
  const [criteria, setCriteria] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Match lists
  const [mutual, setMutual] = useState<any[]>([]);
  const [them, setThem] = useState<any[]>([]);
  const [me, setMe] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  // Modals
  const [showGuide, setShowGuide] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Admin State ─────────────────────────────────────────────────────────
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [adminTab, setAdminTab] = useState<'members' | 'one_way_pairs' | 'mutual_pairs' | 'monitoring' | 'connections'>('members');
  const [adminSearch, setAdminSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [viewingMmAlumniId, setViewingMmAlumniId] = useState<number | null>(null);
  const [mockLoading, setMockLoading] = useState(false);
  const [mockResultModal, setMockResultModal] = useState<any>(null);

  const formatYear = (y: any) => {
    if (!y) return '';
    const s = String(y).trim();
    const m = s.match(/^(19\d\d|20\d\d)\d?$/);
    if (m) return m[1];
    return s;
  };

  const fetchAdminDashboard = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/matchmaking?tab=dashboard');
      if (res.ok) {
        const d = await res.json();
        setAdminData(d);
      }
    } catch (e) {}
    setAdminLoading(false);
  };

  const handleGenerateMockData = async () => {
    if (!confirm('确认一键生成 3 位测试校友（互相匹配、与我匹配、我匹配的）？\n\n系统将自动生成：\n1. 基准校友（我）：邹春朗（密码 123456）\n2. 互相匹配：林互配（密码 123456）\n3. 与我匹配：白与我（密码 123456）\n4. 我匹配的：赵我配（密码 123456）\n\n测试完成后可随时一键安全清除。')) {
      return;
    }
    setMockLoading(true);
    try {
      const res = await fetch('/api/admin/matchmaking/mock-test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMockResultModal(data);
        fetchAdminDashboard();
      } else {
        alert(data.error || '生成失败');
      }
    } catch (e) {
      alert('网络请求失败');
    } finally {
      setMockLoading(false);
    }
  };

  const handleCleanMockData = async () => {
    if (!confirm('确认清除所有测试校友数据（林互配、白与我、赵我配）？\n\n将彻底清理测试校友档案、相亲资料、择偶条件及关联测试账户。')) {
      return;
    }
    setMockLoading(true);
    try {
      const res = await fetch('/api/admin/matchmaking/mock-test', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '已成功清理测试校友数据');
        fetchAdminDashboard();
      } else {
        alert(data.error || '清理失败');
      }
    } catch (e) {
      alert('网络请求失败');
    } finally {
      setMockLoading(false);
    }
  };

  const handleAdminRemoveMember = async (alumni_id: number, name: string) => {
    if (!confirm(`确认将「${name}」移出喜结连理板块？\n\n【权限与数据说明】：\n1. 仅移除该校友进入喜结连理板块的访问权限。\n2. 该校友已填写的个人自身条件、择偶标准及已有对接记录完整保留在系统中。\n3. 该校友若后续重新申请入驻并经审批通过后，可直接继续使用已有条件，无需重新填写。`)) {
      return;
    }
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/matchmaking', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumni_id }),
      });
      if (res.ok) {
        alert(`已成功将「${name}」移出喜结连理板块`);
        fetchAdminDashboard();
      } else {
        const d = await res.json();
        alert(d.error || '操作失败');
      }
    } catch (e) {
      alert('网络错误，请稍后重试');
    } finally {
      setAdminLoading(false);
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          router.replace('/login');
          return;
        }
        const role = data.user?.role;
        setUserRole(role);
        if (role === 'ADMIN') {
          fetchAdminDashboard();
          setLoading(false);
        } else {
          fetch('/api/matchmaking/application')
            .then(r => r.json())
            .then(d => {
              const status = d.application?.status || null;
              setMmStatus(status);
              if (status === 'APPROVED') {
                loadProfileAndCriteria();
                loadMatches();
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const loadProfileAndCriteria = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch('/api/matchmaking/profile').then(r => r.json()),
      fetch('/api/matchmaking/criteria').then(r => r.json()),
    ]);
    const p = pRes.profile || {};
    const c = cRes.criteria || {};
    setProfile(prev => ({ ...p, hobbies: parseJ(p.hobbies), personality: parseJ(p.personality), parents_job: parseJ(p.parents_job) }));
    setCriteria(prev => ({
      ...c,
      marital_status: parseJ(c.marital_status),
      region: parseJ(c.region),
      property_status: parseJ(c.property_status),
      job_type: parseJ(c.job_type),
      parents_job: parseJ(c.parents_job),
      hobbies: parseJ(c.hobbies),
      personality: parseJ(c.personality),
    }));
    // Show guide if not completed
    if (!p.profile_completed) setShowGuide(true);
  }, []);

  const loadMatches = useCallback(async () => {
    setMatchLoading(true);
    const [mRes, tRes, meRes] = await Promise.all([
      fetch('/api/matchmaking/matches?type=mutual').then(r => r.json()),
      fetch('/api/matchmaking/matches?type=them').then(r => r.json()),
      fetch('/api/matchmaking/matches?type=me').then(r => r.json()),
    ]);
    setMutual(mRes.matches || []);
    setThem(tRes.matches || []);
    setMe(meRes.matches || []);
    setMatchLoading(false);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/matchmaking/profile', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(profile) }),
        fetch('/api/matchmaking/criteria', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(criteria) }),
      ]);
      const pD = await pRes.json();
      if (!pRes.ok) { setSaveMsg('❌ ' + (pD.error || '保存失败')); return; }
      setSaveMsg('✅ 保存成功！');
      setShowGuide(false);
      loadMatches();
    } catch { setSaveMsg('❌ 网络错误，请重试'); }
    finally { setSaving(false); }
  };

  // ── Connection actions ────────────────────────────────────────────────────
  const handleConnection = async (action: string, target_alumni_id: number, reject_reason?: string) => {
    setActionLoading(true);
    const res = await fetch('/api/matchmaking/connections', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ action, target_alumni_id, reject_reason }),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.error || '操作失败'); }
    else {
      setReviewModal(null);
      loadMatches();
      window.dispatchEvent(new Event('unreadCountUpdate'));
    }
    setActionLoading(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const pSet = (k: string, v: any) => setProfile((p: any) => ({ ...p, [k]: v }));
  const cSet = (k: string, v: any) => setCriteria((c: any) => ({ ...c, [k]: v }));
  const toggleArr = (arr: string[], val: string): string[] => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const renderPairConnectionStatus = (conn: any) => {
    if (!conn || conn.status === 'NONE') {
      return (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
          ✨ 未发起对接
        </span>
      );
    }
    if (conn.status === 'APPROVED') {
      return (
        <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          💖 已经对接成功（互相解锁）
        </span>
      );
    }
    if (conn.status === 'PENDING') {
      return (
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          ⏳ 对接待审核 {conn.applicant_name ? `(${conn.applicant_name}发起)` : ''}
        </span>
      );
    }
    if (conn.status === 'REJECTED') {
      return (
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.3)' }} title={conn.reject_reason ? `拒绝原因: ${conn.reject_reason}` : '已被拒绝'}>
          ❌ 对接已被拒绝 {conn.applicant_name ? `(${conn.applicant_name}发起)` : ''}
        </span>
      );
    }
    return null;
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>加载中…</div>;

  // ── Admin Dashboard View ───────────────────────────────────────────────────
  if (userRole === 'ADMIN') {
    const overview = adminData?.overview || {};
    const potentialMutualPairs = adminData?.mutualPairs || adminData?.potentialMutualPairs || [];
    const oneWayPairs = adminData?.oneWayPairs || [];
    const applicantStats = adminData?.applicantStats || [];
    const recentConnections = (adminData?.recentConnections || []).filter((item: any) => {
      if (adminStatusFilter && item.status !== adminStatusFilter) return false;
      if (adminSearch) {
        const q = adminSearch.toLowerCase();
        return (
          item.applicant_name?.toLowerCase().includes(q) ||
          item.target_name?.toLowerCase().includes(q) ||
          item.applicant_wechat?.toLowerCase().includes(q) ||
          item.target_wechat?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const rawApprovedList = adminData?.approvedMemberList || [];
    const filteredMembers = rawApprovedList.filter((m: any) => {
      if (!memberSearch) return true;
      const q = memberSearch.toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.college?.toLowerCase().includes(q) ||
        m.major?.toLowerCase().includes(q) ||
        m.wechat_id?.toLowerCase().includes(q) ||
        m.phone?.includes(q)
      );
    });

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', color: '#f8fafc', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5, color: '#f8fafc' }}>
                  喜结连理 · 管理控制台
                </h1>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700 }}>
                  管理员专区
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13.5, marginTop: 6, marginBottom: 0 }}>
                实时掌控校友单身入驻状态、审核资料与全站对接申请
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={fetchAdminDashboard}
                style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#f8fafc', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>🔄</span> 刷新数据
              </button>
              <button
                onClick={() => setAdminModalOpen(true)}
                style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: '#fff', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}
              >
                去审核入驻申请 {overview.pendingApps > 0 ? `(${overview.pendingApps})` : ''} ➔
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            {/* 1. Members */}
            <div 
              onClick={() => setAdminTab('members')}
              title="点击查看已入驻校友列表"
              style={{ 
                background: adminTab === 'members' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.04)', 
                border: '1px solid ' + (adminTab === 'members' ? '#3b82f6' : 'rgba(255,255,255,0.08)'), 
                borderRadius: 16, 
                padding: '20px 22px', 
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: adminTab === 'members' ? '0 0 20px rgba(59, 130, 246, 0.25)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: adminTab === 'members' ? '#60a5fa' : '#94a3b8', fontSize: 13, fontWeight: 700 }}>👥 已入驻单身校友</div>
                <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>查看列表 ➔</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#f8fafc', margin: '8px 0 6px' }}>{overview.approvedMembers || 0} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>人</span></div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#60a5fa' }}>男 {overview.maleMembers || 0}</span> · <span style={{ color: '#f472b6' }}>女 {overview.femaleMembers || 0}</span> · <span style={{ color: '#34d399' }}>完善 {overview.completedProfiles || 0}</span>
              </div>
            </div>

            {/* 2. One-Way Matches */}
            <div 
              onClick={() => setAdminTab('one_way_pairs')}
              title="点击查看单方面满足对方择偶条件的配对"
              style={{ 
                background: adminTab === 'one_way_pairs' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)', 
                border: '1px solid ' + (adminTab === 'one_way_pairs' ? '#38bdf8' : 'rgba(255,255,255,0.08)'), 
                borderRadius: 16, 
                padding: '20px 22px', 
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: adminTab === 'one_way_pairs' ? '0 0 20px rgba(56, 189, 248, 0.25)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: adminTab === 'one_way_pairs' ? '#38bdf8' : '#94a3b8', fontSize: 13, fontWeight: 700 }}>👉 单向匹配（算法满足）</div>
                <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>查看列表 ➔</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#38bdf8', margin: '8px 0 6px' }}>
                {overview.potentialOneWayMatches || 0} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>对</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                单方满足条件 · A ➔ B
              </div>
            </div>

            {/* 3. Mutual Matches */}
            <div 
              onClick={() => setAdminTab('mutual_pairs')}
              title="点击查看算法双向完全契合的互相匹配列表"
              style={{ 
                background: adminTab === 'mutual_pairs' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)', 
                border: '1px solid ' + (adminTab === 'mutual_pairs' ? '#f59e0b' : 'rgba(255,255,255,0.08)'), 
                borderRadius: 16, 
                padding: '20px 22px', 
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: adminTab === 'mutual_pairs' ? '0 0 20px rgba(245, 158, 11, 0.25)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: adminTab === 'mutual_pairs' ? '#fbbf24' : '#94a3b8', fontSize: 13, fontWeight: 700 }}>💕 互相匹配（算法满足）</div>
                <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>查看列表 ➔</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#fbbf24', margin: '8px 0 6px' }}>
                {overview.potentialMutualMatches || 0} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>对</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                双向完全契合 · 自动对接成功
              </div>
            </div>

            {/* 4. Connected Success */}
            <div 
              onClick={() => setAdminTab('connections')}
              title="点击查看对接记录"
              style={{ 
                background: 'rgba(255,255,255,0.04)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: 16, 
                padding: '20px 22px', 
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>💖 对接成功（互相解锁）</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#34d399', margin: '8px 0 6px' }}>{overview.approvedConnections || 0} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>对</span></div>
              <div style={{ fontSize: 12, color: '#64748b' }}>含互相匹配与单向申请成功 · 待审 {overview.pendingConnections || 0}</div>
            </div>

            {/* 5. Pending Apps */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(10px)' }}>
              <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>⏳ 待审核入驻</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: overview.pendingApps > 0 ? '#fbbf24' : '#f8fafc', margin: '8px 0 6px' }}>
                {overview.pendingApps || 0} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>人</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>累计申请人次: {overview.totalApps || 0}</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20, overflowX: 'auto' }}>
            <button
              onClick={() => setAdminTab('members')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14.5,
                fontWeight: adminTab === 'members' ? 700 : 500,
                color: adminTab === 'members' ? '#60a5fa' : '#94a3b8',
                borderBottom: adminTab === 'members' ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              👥 已入驻校友列表 ({rawApprovedList.length})
            </button>
            <button
              onClick={() => setAdminTab('one_way_pairs')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14.5,
                fontWeight: adminTab === 'one_way_pairs' ? 700 : 500,
                color: adminTab === 'one_way_pairs' ? '#38bdf8' : '#94a3b8',
                borderBottom: adminTab === 'one_way_pairs' ? '2px solid #38bdf8' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              👉 单向匹配列表 ({oneWayPairs.length})
            </button>
            <button
              onClick={() => setAdminTab('mutual_pairs')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14.5,
                fontWeight: adminTab === 'mutual_pairs' ? 700 : 500,
                color: adminTab === 'mutual_pairs' ? '#fbbf24' : '#94a3b8',
                borderBottom: adminTab === 'mutual_pairs' ? '2px solid #f59e0b' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              💕 互相匹配列表 ({potentialMutualPairs.length})
            </button>
            <button
              onClick={() => setAdminTab('monitoring')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14.5,
                fontWeight: adminTab === 'monitoring' ? 700 : 500,
                color: adminTab === 'monitoring' ? '#f87171' : '#94a3b8',
                borderBottom: adminTab === 'monitoring' ? '2px solid #ef4444' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              ⚠️ 发起申请频次榜（骚扰排查）
            </button>
            <button
              onClick={() => setAdminTab('connections')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14.5,
                fontWeight: adminTab === 'connections' ? 700 : 500,
                color: adminTab === 'connections' ? '#34d399' : '#94a3b8',
                borderBottom: adminTab === 'connections' ? '2px solid #10b981' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              📋 全站对接动态流水
            </button>
          </div>

          {/* Tab Content 0: Approved Members */}
          {adminTab === 'members' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <input
                  type="text"
                  placeholder="搜索姓名、学院、专业或微信号..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 240, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f8fafc', fontSize: 13, outline: 'none' }}
                />
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  共找到 <strong style={{ color: '#f8fafc' }}>{filteredMembers.length}</strong> 位已入驻单身校友
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)' }}>
                  暂无匹配的已入驻校友
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredMembers.map((item: any) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.08)', 
                        borderLeft: '4px solid #10b981',
                        borderRadius: 16, 
                        padding: '18px 22px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        gap: 20, 
                        flexWrap: 'wrap',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span 
                            onClick={() => setViewingMmAlumniId(item.alumni_id || item.id)}
                            title="点击查看校友喜结连理档案与个人资料（只读）"
                            style={{ fontSize: 17, fontWeight: 800, color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                          >
                            {item.name}
                          </span>
                          <span style={{ 
                            fontSize: 11, 
                            padding: '2px 7px', 
                            borderRadius: 4, 
                            background: isFemaleGender(item.gender) ? 'rgba(244, 114, 182, 0.2)' : 'rgba(96, 165, 250, 0.2)', 
                            color: isFemaleGender(item.gender) ? '#f472b6' : '#60a5fa', 
                            fontWeight: 700 
                          }}>
                            {genderLabel(item.gender)}
                          </span>
                          <span style={{ 
                            fontSize: 11, 
                            padding: '2px 8px', 
                            borderRadius: 6, 
                            fontWeight: 700, 
                            background: item.profile_completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', 
                            color: item.profile_completed ? '#34d399' : '#fbbf24',
                            border: '1px solid ' + (item.profile_completed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)')
                          }}>
                            {item.profile_completed ? '✅ 条件已完善' : '⚠️ 尚未完善条件'}
                          </span>
                        </div>

                        <div style={{ color: '#cbd5e1', fontSize: 13.5, marginBottom: 8 }}>
                          {item.college || '—'} · {item.enrollment_year ? formatYear(item.enrollment_year) + '级' : '—'} {item.major ? `· ${item.major}` : ''} {item.degree ? `(${item.degree})` : ''}
                          {item.region ? ` · 现居 ${item.region}` : ''}
                        </div>

                        {/* Contact & Match Stats */}
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
                          <span style={{ color: '#34d399', fontWeight: 600, background: 'rgba(16, 185, 129, 0.12)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                            💬 微信: {item.wechat_id || '未填写'}
                          </span>
                          {item.phone && (
                            <span style={{ color: '#93c5fd' }}>
                              📱 手机: {item.phone}
                            </span>
                          )}
                          <span style={{ color: '#cbd5e1', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '3px 10px', borderRadius: 6 }}>
                            ✨ 潜在互配: <strong style={{ color: (item.potential_mutual_count || 0) > 0 ? '#fbbf24' : '#94a3b8' }}>{item.potential_mutual_count || 0}</strong> 人
                          </span>
                          <span style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 6 }}>
                            主动发起申请: <strong style={{ color: item.applied_count > 0 ? '#60a5fa' : '#94a3b8' }}>{item.applied_count || 0}</strong> 次
                          </span>
                          <span style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 6 }}>
                            收到申请: <strong style={{ color: item.received_count > 0 ? '#f472b6' : '#94a3b8' }}>{item.received_count || 0}</strong> 次
                          </span>
                          <span style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 6 }}>
                            已成功对接: <strong style={{ color: item.mutual_count > 0 ? '#34d399' : '#94a3b8' }}>{item.mutual_count || 0}</strong> 对
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>
                          入驻时间: {item.approved_at ? item.approved_at.slice(0, 10) : '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setViewingMmAlumniId(item.alumni_id || item.id)}
                            style={{
                              padding: '7px 14px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              color: '#60a5fa',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            title="查看喜结连理档案（自身条件与择偶标准，只读模式）"
                          >
                            🔍 查阅相亲档案
                          </button>
                          <button
                            onClick={() => handleAdminRemoveMember(item.alumni_id, item.name)}
                            disabled={adminLoading}
                            style={{
                              padding: '7px 16px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              color: '#f87171',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.3)';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.15)';
                            }}
                            title="移出板块：仅移除进入喜结连理权限，个人资料与择偶条件完整保留，下次审核通过可直接恢复"
                          >
                            移出板块
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: One-Way Matches */}
          {adminTab === 'one_way_pairs' && (
            <div>
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div style={{ fontSize: 13.5, color: '#bae6fd', lineHeight: 1.6 }}>
                  👉 <strong>单向匹配说明：</strong>当前系统检测到共有 <strong style={{ color: '#38bdf8', fontSize: 15 }}>{oneWayPairs.length}</strong> 对单向契合（<strong style={{ color: '#38bdf8' }}>A ➔ B</strong> 代表 A 的个人条件满足了 B 设定的全部择偶要求，但 B 暂未满足 A 的择偶条件）。校友进入个人中心可在【满足我的条件】或【我满足的条件】中查看并主动发起对接。
                </div>
              </div>

              {oneWayPairs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>暂无单向匹配的校友配对</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>当某位校友的各项个人条件完全符合另一位校友的择偶要求时，系统将自动汇总于此。</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {oneWayPairs.map((pair: any, idx: number) => {
                    const isFromFemale = isFemaleGender(pair.from.gender);
                    const isToFemale = isFemaleGender(pair.to.gender);
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 16,
                          padding: '20px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 20,
                          transition: 'all 0.2s',
                        }}
                      >
                        {/* From Party (满足方) */}
                        <div style={{
                          flex: 1,
                          minWidth: 260,
                          background: isFromFemale ? 'rgba(244, 114, 182, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                          border: `1px solid ${isFromFemale ? 'rgba(244, 114, 182, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
                          borderRadius: 12,
                          padding: '16px 18px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: isFromFemale ? '#fbcfe8' : '#93c5fd' }}>
                              {isFromFemale ? '👩' : '👨'} {pair.from.name}
                            </span>
                            <span style={{
                              fontSize: 11.5,
                              background: isFromFemale ? 'rgba(244, 114, 182, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                              color: isFromFemale ? '#f472b6' : '#60a5fa',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600
                            }}>
                              条件满足方 · {genderLabel(pair.from.gender)} · {pair.from.age}岁
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 }}>
                            <div>🏫 {pair.from.college || '未知学院'} · {pair.from.major || '未知专业'} {pair.from.degree ? `(${pair.from.degree})` : ''}</div>
                            <div>💼 {pair.from.job_type || '单位类型未填'} · 年薪 {pair.from.annual_income ? `${pair.from.annual_income}万` : '保密'}</div>
                            <div>🏠 {pair.from.property_status || '房产未填'}</div>
                          </div>
                          <button
                            onClick={() => setViewingMmAlumniId(pair.from.alumni_id)}
                            style={{
                              marginTop: 10,
                              padding: '5px 12px',
                              background: isFromFemale ? 'rgba(244, 114, 182, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              border: `1px solid ${isFromFemale ? 'rgba(244, 114, 182, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                              color: isFromFemale ? '#fbcfe8' : '#93c5fd',
                              borderRadius: 6,
                              fontSize: 11.5,
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            查看档案 ➔
                          </button>
                        </div>

                        {/* Middle Arrow & Direction Badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 12px', flexShrink: 0, minWidth: 200 }}>
                          <div style={{ fontSize: 26, color: '#38bdf8', fontWeight: 800, letterSpacing: -1, marginBottom: 2 }}>
                            ─────➔
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 12px', borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: 6 }}>
                            单向满足
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 10, lineHeight: 1.4 }}>
                            <strong style={{ color: '#f8fafc' }}>{pair.from.name}</strong> 满足了 <strong style={{ color: '#f8fafc' }}>{pair.to.name}</strong> 的要求
                          </div>
                          <div>
                            {renderPairConnectionStatus(pair.connection)}
                          </div>
                        </div>

                        {/* To Party (需求方) */}
                        <div style={{
                          flex: 1,
                          minWidth: 260,
                          background: isToFemale ? 'rgba(244, 114, 182, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                          border: `1px solid ${isToFemale ? 'rgba(244, 114, 182, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
                          borderRadius: 12,
                          padding: '16px 18px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: isToFemale ? '#fbcfe8' : '#93c5fd' }}>
                              {isToFemale ? '👩' : '👨'} {pair.to.name}
                            </span>
                            <span style={{
                              fontSize: 11.5,
                              background: isToFemale ? 'rgba(244, 114, 182, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                              color: isToFemale ? '#f472b6' : '#60a5fa',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600
                            }}>
                              择偶要求方 · {genderLabel(pair.to.gender)} · {pair.to.age}岁
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 }}>
                            <div>🏫 {pair.to.college || '未知学院'} · {pair.to.major || '未知专业'} {pair.to.degree ? `(${pair.to.degree})` : ''}</div>
                            <div>💼 {pair.to.job_type || '单位类型未填'} · 年薪 {pair.to.annual_income ? `${pair.to.annual_income}万` : '保密'}</div>
                            <div>🏠 {pair.to.property_status || '房产未填'}</div>
                          </div>
                          <button
                            onClick={() => setViewingMmAlumniId(pair.to.alumni_id)}
                            style={{
                              marginTop: 10,
                              padding: '5px 12px',
                              background: isToFemale ? 'rgba(244, 114, 182, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              border: `1px solid ${isToFemale ? 'rgba(244, 114, 182, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                              color: isToFemale ? '#fbcfe8' : '#93c5fd',
                              borderRadius: 6,
                              fontSize: 11.5,
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            查看档案 ➔
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Mutual Matches (Algorithm) */}
          {adminTab === 'mutual_pairs' && (
            <div>
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div style={{ fontSize: 13.5, color: '#fde68a', lineHeight: 1.6 }}>
                  💕 <strong>互相匹配列表说明：</strong>当前系统检测到共有 <strong style={{ color: '#fbbf24', fontSize: 15 }}>{potentialMutualPairs.length}</strong> 对男女校友自身条件与择偶期望完全双向契合。双方已自动对接成功并互相解锁联系方式，无需额外发起对接申请。
                </div>
              </div>

              {potentialMutualPairs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>暂无双向完全匹配的校友对</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>当单身校友互相满足对方的年龄、学历、收入、房产、性格及生活习惯等全部指标时，系统将自动汇聚在此。</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {potentialMutualPairs.map((pair: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16,
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 20,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Male Party */}
                      <div style={{ flex: 1, minWidth: 260, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 12, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#93c5fd' }}>
                            👨 {pair.male.name}
                          </span>
                          <span style={{ fontSize: 11.5, background: 'rgba(59, 130, 246, 0.25)', color: '#60a5fa', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            男方 · {pair.male.age}岁
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 }}>
                          <div>🏫 {pair.male.college || '未知学院'} · {pair.male.major || '未知专业'} {pair.male.degree ? `(${pair.male.degree})` : ''}</div>
                          <div>💼 {pair.male.job_type || '单位类型未填'} · 年薪 {pair.male.annual_income ? `${pair.male.annual_income}万` : '保密'}</div>
                          <div>🏠 {pair.male.property_status || '房产未填'}</div>
                        </div>
                        <button
                          onClick={() => setViewingMmAlumniId(pair.male.alumni_id)}
                          style={{ marginTop: 10, padding: '5px 12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93c5fd', borderRadius: 6, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}
                        >
                          查看男方相亲档案 ➔
                        </button>
                      </div>

                      {/* Middle Badge / Heart */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 10px', flexShrink: 0, minWidth: 160 }}>
                        <div style={{ fontSize: 30, marginBottom: 4 }}>❤️</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '4px 14px', borderRadius: 14, border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                          双向契合 · 自动解锁
                        </div>
                      </div>

                      {/* Female Party */}
                      <div style={{ flex: 1, minWidth: 260, background: 'rgba(244, 114, 182, 0.08)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: 12, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#fbcfe8' }}>
                            👩 {pair.female.name}
                          </span>
                          <span style={{ fontSize: 11.5, background: 'rgba(244, 114, 182, 0.25)', color: '#f472b6', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            女方 · {pair.female.age}岁
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 }}>
                          <div>🏫 {pair.female.college || '未知学院'} · {pair.female.major || '未知专业'} {pair.female.degree ? `(${pair.female.degree})` : ''}</div>
                          <div>💼 {pair.female.job_type || '单位类型未填'} · 年薪 {pair.female.annual_income ? `${pair.female.annual_income}万` : '保密'}</div>
                          <div>🏠 {pair.female.property_status || '房产未填'}</div>
                        </div>
                        <button
                          onClick={() => setViewingMmAlumniId(pair.female.alumni_id)}
                          style={{ marginTop: 10, padding: '5px 12px', background: 'rgba(244, 114, 182, 0.15)', border: '1px solid rgba(244, 114, 182, 0.3)', color: '#fbcfe8', borderRadius: 6, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}
                        >
                          查看女方相亲档案 ➔
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content 1: Monitoring */}
          {adminTab === 'monitoring' && (
            <div>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#fca5a5', lineHeight: 1.6 }}>
                💡 <strong>功能说明</strong>：本榜单按校友主动发起对接的次数进行降序统计。若某位校友在短时间内大量向不同异性发起对接且被频繁拒绝，管理员可重点关注与核实，避免给其他校友造成骚扰（此功能仅供管理员参考研判，由管理员自行判断处理，系统不自动干预）。
              </div>

              {applicantStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)' }}>
                  暂无对接申请记录
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
                  <style dangerouslySetInnerHTML={{ __html: `
                    .admin-monitoring-table thead,
                    .admin-monitoring-table thead tr,
                    .admin-monitoring-table thead th {
                      background: rgba(255, 255, 255, 0.05) !important;
                      color: #94a3b8 !important;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                    }
                    .admin-monitoring-table tbody tr {
                      background: transparent !important;
                    }
                    .admin-monitoring-table tbody tr:hover {
                      background: rgba(255, 255, 255, 0.08) !important;
                    }
                  `}} />
                  <table className="admin-monitoring-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>申请人</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>学院 · 年级</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>微信号 / 手机</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>累计申请次数</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>结果分布</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>最近发起时间</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicantStats.map((item: any) => {
                        const isHighFreq = item.total_applied >= 8;
                        const isMedFreq = item.total_applied >= 4;
                        return (
                          <tr
                            key={item.applicant_alumni_id}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                              <span style={{ color: '#f8fafc' }}>{item.applicant_name}</span>
                              <span style={{ 
                                marginLeft: 6, 
                                fontSize: 11, 
                                padding: '2px 6px', 
                                borderRadius: 4, 
                                background: isFemaleGender(item.applicant_gender) ? 'rgba(244, 114, 182, 0.2)' : 'rgba(96, 165, 250, 0.2)', 
                                color: isFemaleGender(item.applicant_gender) ? '#f472b6' : '#60a5fa' 
                              }}>
                                {genderLabel(item.applicant_gender)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                              {item.applicant_college || '—'} · {item.applicant_year ? (formatYear(item.applicant_year) || item.applicant_year) + '级' : '—'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ color: '#34d399', fontWeight: 600, fontSize: 12 }}>💬 {item.applicant_wechat || '未填'}</div>
                              {item.applicant_phone && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>📱 {item.applicant_phone}</div>}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ 
                                padding: '4px 12px', 
                                borderRadius: 20, 
                                fontWeight: 800, 
                                fontSize: 13,
                                background: isHighFreq ? 'rgba(239, 68, 68, 0.25)' : isMedFreq ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.08)',
                                color: isHighFreq ? '#f87171' : isMedFreq ? '#fbbf24' : '#cbd5e1',
                                border: '1px solid ' + (isHighFreq ? 'rgba(239, 68, 68, 0.4)' : isMedFreq ? 'rgba(245, 158, 11, 0.4)' : 'transparent'),
                              }}>
                                {item.total_applied} 次 {isHighFreq ? '⚠️ 高频' : ''}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12 }}>
                              <span style={{ color: '#34d399', marginRight: 8 }}>✅ 成功 {item.approved_count}</span>
                              <span style={{ color: '#fbbf24', marginRight: 8 }}>⏳ 等待 {item.pending_count}</span>
                              <span style={{ color: '#f87171' }}>❌ 被拒 {item.rejected_count}</span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                              {item.latest_applied_at ? item.latest_applied_at.slice(0, 16).replace('T', ' ') : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  setAdminSearch(item.applicant_name);
                                  setAdminTab('connections');
                                }}
                                style={{ padding: '5px 12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                              >
                                查看流水
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: Connections Stream */}
          {adminTab === 'connections' && (
            <div>
              {/* Filter Row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="搜索校友姓名或微信号..."
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 220, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f8fafc', fontSize: 13, outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { val: '', label: '全部状态' },
                    { val: 'PENDING', label: '⏳ 审核中' },
                    { val: 'APPROVED', label: '💖 已成功对接' },
                    { val: 'REJECTED', label: '❌ 暂不考虑' },
                    { val: 'WITHDRAWN', label: '↩️ 已撤回' },
                  ].map(f => (
                    <button
                      key={f.val}
                      onClick={() => setAdminStatusFilter(f.val)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        cursor: 'pointer',
                        border: '1px solid ' + (adminStatusFilter === f.val ? '#3b82f6' : 'rgba(255,255,255,0.1)'),
                        background: adminStatusFilter === f.val ? '#3b82f6' : 'rgba(255,255,255,0.04)',
                        color: adminStatusFilter === f.val ? '#fff' : '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                  {(adminSearch || adminStatusFilter) && (
                    <button
                      onClick={() => { setAdminSearch(''); setAdminStatusFilter(''); }}
                      style={{ padding: '8px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                    >
                      ✕ 清空筛选
                    </button>
                  )}
                </div>
              </div>

              {recentConnections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)' }}>
                  没有符合条件的对接流水记录
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentConnections.map((item: any) => {
                    const isApproved = item.status === 'APPROVED';
                    const isPending = item.status === 'PENDING';
                    const isRejected = item.status === 'REJECTED';

                    return (
                      <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                          {/* Applicant */}
                          <div style={{ minWidth: 120 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>
                              {item.applicant_name}
                              <span style={{ 
                                marginLeft: 6, 
                                fontSize: 11, 
                                padding: '1px 5px', 
                                borderRadius: 4, 
                                background: isFemaleGender(item.applicant_gender) ? 'rgba(244, 114, 182, 0.2)' : 'rgba(96, 165, 250, 0.2)', 
                                color: isFemaleGender(item.applicant_gender) ? '#f472b6' : '#60a5fa' 
                              }}>
                                {genderLabel(item.applicant_gender)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#34d399', marginTop: 2 }}>💬 {item.applicant_wechat || '未填'}</div>
                          </div>

                          <div style={{ color: '#64748b', fontSize: 18 }}>➔</div>

                          {/* Target */}
                          <div style={{ minWidth: 120 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>
                              {item.target_name}
                              <span style={{ 
                                marginLeft: 6, 
                                fontSize: 11, 
                                padding: '1px 5px', 
                                borderRadius: 4, 
                                background: isFemaleGender(item.target_gender) ? 'rgba(244, 114, 182, 0.2)' : 'rgba(96, 165, 250, 0.2)', 
                                color: isFemaleGender(item.target_gender) ? '#f472b6' : '#60a5fa' 
                              }}>
                                {genderLabel(item.target_gender)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#34d399', marginTop: 2 }}>💬 {item.target_wechat || '未填'}</div>
                          </div>
                        </div>

                        {/* Status & Time */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{
                            fontSize: 12,
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontWeight: 700,
                            background: isApproved ? 'rgba(16, 185, 129, 0.2)' : isPending ? 'rgba(245, 158, 11, 0.2)' : isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)',
                            color: isApproved ? '#34d399' : isPending ? '#fbbf24' : isRejected ? '#f87171' : '#94a3b8',
                            border: '1px solid ' + (isApproved ? 'rgba(16, 185, 129, 0.3)' : isPending ? 'rgba(245, 158, 11, 0.3)' : isRejected ? 'rgba(239, 68, 68, 0.3)' : 'transparent'),
                          }}>
                            {isApproved ? '💖 对接成功（已解锁）' : isPending ? '⏳ 审核中（等待对方）' : isRejected ? '❌ 对方暂不考虑' : '↩️ 已撤回'}
                          </span>
                          {isRejected && item.reject_reason && (
                            <div style={{ fontSize: 11, color: '#f87171' }}>原因: {item.reject_reason}</div>
                          )}
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>
                            申请时间: {item.created_at ? item.created_at.slice(0, 16).replace('T', ' ') : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Matchmaking Read-Only Detail Modal */}
          {viewingMmAlumniId && (
            <MatchmakingDetailModal
              alumniId={viewingMmAlumniId}
              onClose={() => setViewingMmAlumniId(null)}
              onOpenEditAlumni={(a) => setSelectedAdminUser(a)}
            />
          )}

          {/* Alumni Profile Detail / Edit Modal */}
          {selectedAdminUser && (
            <AlumniForm
              initial={{
                ...selectedAdminUser,
                id: selectedAdminUser.alumni_id || selectedAdminUser.id,
                userId: selectedAdminUser.userId || selectedAdminUser.user_id || (selectedAdminUser.alumni_id ? selectedAdminUser.id : undefined),
                status: selectedAdminUser.status || selectedAdminUser.user_status || 'APPROVED',
                experiences: selectedAdminUser.experiences || [],
                registration: selectedAdminUser.registration || ((selectedAdminUser.user_id || selectedAdminUser.userId || (selectedAdminUser.id && selectedAdminUser.alumni_id)) ? {
                  isRegistered: selectedAdminUser.user_status === 'APPROVED' || selectedAdminUser.status === 'APPROVED',
                  userId: selectedAdminUser.user_id || selectedAdminUser.userId || selectedAdminUser.id,
                  status: selectedAdminUser.user_status || selectedAdminUser.status || 'APPROVED',
                  role: selectedAdminUser.role || 'USER'
                } : undefined)
              }}
              onClose={() => setSelectedAdminUser(null)}
              onSaved={() => {
                setSelectedAdminUser(null);
                fetchAdminDashboard();
              }}
            />
          )}

          {/* Mock Test Result Modal */}
          {mockResultModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, maxWidth: 620, width: '100%', padding: '28px 32px', color: '#f8fafc', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>🧪</span>
                    <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#f8fafc' }}>测试校友数据已生成</h2>
                  </div>
                  <button onClick={() => setMockResultModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#93c5fd', lineHeight: 1.6 }}>
                  💡 <strong>基准校友（我）</strong>：姓名 <strong>邹春朗</strong>，账号 <strong>邹春朗</strong>，初始密码 <strong>123456</strong>。已配置自身条件（男·32岁·178cm·硕士·年薪45万）与择偶标准。
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
                    已成功注入以下 3 位候选人（密码均为 <strong>123456</strong>）：
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#34d399', fontSize: 15 }}>1. 互相匹配：林互配</span>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>互符标准</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                        账号: <strong>林互配</strong> · 密码: <strong>123456</strong> · 微信号: lin_hupei<br />
                        女·27岁·166cm·硕士·年薪28万。双方条件与期望完全契合，出现在【互相匹配】Tab。
                      </div>
                    </div>

                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 15 }}>2. 与我匹配：白与我</span>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }}>对方符合我</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                        账号: <strong>白与我</strong> · 密码: <strong>123456</strong> · 微信号: bai_yuwo<br />
                        女·26岁·168cm·硕士·年薪36万。她符合你的择偶条件，但她要求男方年薪100万+、身高185+，你未达到，出现在【与我匹配】Tab。
                      </div>
                    </div>

                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: 15 }}>3. 我匹配的：赵我配</span>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 600 }}>我符合对方</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                        账号: <strong>赵我配</strong> · 密码: <strong>123456</strong> · 微信号: zhao_wopei<br />
                        女·35岁·156cm·抽烟。你完全符合她的择偶条件，但她自身条件不符合你的标准，出现在【我匹配的】Tab。
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => setMockResultModal(null)}
                    style={{ padding: '9px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    我知道了，去体验
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mmStatus !== 'APPROVED') return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>💞</div>
      <h2 style={{ color: '#c0392b', margin: '16px 0 8px' }}>喜结连理</h2>
      <p style={{ color: '#666' }}>您尚未加入喜结连理板块，请通过左侧菜单申请加入。</p>
    </div>
  );

  // ── Tab counts & Pending Reviews ───────────────────────────────────────────
  const themPendingCount = them.filter(m => m.connection?.theirRequest?.status === 'PENDING').length;
  const mePendingCount = me.filter(m => m.connection?.theirRequest?.status === 'PENDING').length;
  const totalPendingReviews = themPendingCount + mePendingCount;

  const tabList: { key: TabType; label: string; count?: number; pendingCount?: number }[] = [
    { key: 'criteria', label: '择偶标准' },
    { key: 'mutual', label: '互相匹配', count: mutual.length },
    { key: 'them', label: '与我匹配', count: them.length, pendingCount: themPendingCount },
    { key: 'me', label: '我匹配的', count: me.length, pendingCount: mePendingCount },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Guide Modal */}
      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowGuide(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48 }}>🎉</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#c0392b', margin: '12px 0 4px' }}>欢迎加入喜结连理！</h3>
              <p style={{ color: '#666', fontSize: 13 }}>您已成功通过审核，现在可以使用喜结连理板块了</p>
            </div>
            <div style={{ background: '#fff5f5', borderRadius: 12, padding: '16px 20px', marginBottom: 20, fontSize: 13.5, color: '#444', lineHeight: 1.8 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>在开始匹配之前，请先完善：</p>
              <p style={{ margin: '0 0 4px' }}>📋 <strong>个人自身条件</strong>：填写您的基本情况</p>
              <p style={{ margin: 0 }}>🎯 <strong>择偶标准</strong>：填写您对另一半的期望</p>
            </div>
            <div style={{ background: '#fef3cd', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12.5, color: '#856404' }}>
              📍 请在下方表格中填写信息，然后点击「保存」
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowGuide(false)} style={{ flex: 1, padding: '10px 0', border: '1px solid #ddd', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#666' }}>稍后填写</button>
              <button onClick={() => { setShowGuide(false); setActiveTab('criteria'); }} style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 10, background: '#c0392b', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>立即填写</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDetailModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>👀 查看对方详情</h3>
              <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>
            <ProfileDetailTable m={detailModal} showContact />
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setReviewModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>👀 审核对接申请</h3>
              <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>对方已申请对接，请查看其详细信息后决定是否通过</p>
            <ProfileDetailTable m={reviewModal} showContact={false} />
            <div style={{ background: '#fff5f5', borderRadius: 8, padding: '10px 14px', margin: '16px 0', fontSize: 12.5, color: '#c0392b' }}>
              🔒 通过后，您与对方可互相查看完整信息和联系方式
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleConnection('reject', reviewModal.alumni_id)} disabled={actionLoading} style={{ flex: 1, padding: '12px 0', border: '1px solid #ddd', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#666' }}>拒绝</button>
              <button onClick={() => handleConnection('approve', reviewModal.alumni_id)} disabled={actionLoading} style={{ flex: 2, padding: '12px 0', border: 'none', borderRadius: 10, background: '#c0392b', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>通过 ✓</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#c0392b', margin: 0 }}>💞 喜结连理</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>大工苏州校友会 · 校友相亲平台</p>
        </div>

        {/* Incoming Review Notification Banner */}
        {totalPendingReviews > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
            border: '1px solid #fecdd3',
            borderRadius: 14,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            boxShadow: '0 4px 14px rgba(244, 63, 94, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>💌</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#be123c' }}>
                  您收到了 {totalPendingReviews} 位校友发起的对接申请！
                </div>
                <div style={{ fontSize: 12.5, color: '#e11d48', marginTop: 2 }}>
                  {themPendingCount > 0 ? `【与我匹配】中有 ${themPendingCount} 位校友等待您的回应` : ''}
                  {themPendingCount > 0 && mePendingCount > 0 ? '，' : ''}
                  {mePendingCount > 0 ? `【我匹配的】中有 ${mePendingCount} 位校友等待您的回应` : ''}。审核通过后双方即可互相解锁联系方式。
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab(themPendingCount > 0 ? 'them' : 'me')}
              style={{
                padding: '8px 18px',
                background: '#e11d48',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)',
                transition: 'all 0.2s',
              }}
            >
              立即前往审核 ➔
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', marginBottom: 24, gap: 4, overflowX: 'auto' }}>
          {tabList.map(item => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#c0392b' : '#666',
                  borderBottom: isActive ? '2px solid #c0392b' : '2px solid transparent',
                  marginBottom: -2,
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span style={{ fontSize: 13, color: isActive ? '#c0392b' : '#94a3b8' }}>
                    ({item.count})
                  </span>
                )}
                {item.pendingCount !== undefined && item.pendingCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                  }}>
                    <span style={{ fontSize: 8 }}>●</span> {item.pendingCount} 待审核
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Incomplete Conditions Permanent Banner */}
        {!profile.profile_completed && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
            padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#92400e' }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span><strong>提示：</strong>您当前尚未完善条件，系统暂未为您开启校友匹配。请在下方表格中填写自身条件与择偶期望，并点击底部「保存」按钮。</span>
            </div>
            {activeTab !== 'criteria' && (
              <button onClick={() => setActiveTab('criteria')} style={{
                padding: '7px 16px', background: '#c0392b', color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0
              }}>
                立即完善条件 →
              </button>
            )}
          </div>
        )}

        {/* ── Tab 1: 择偶标准 ── */}
        {activeTab === 'criteria' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#c0392b', color: '#fff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: 40 }}>序号</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: 120 }}>条件</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>我的自身条件</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>我的择偶标准</th>
                  </tr>
                </thead>
                <tbody>
                  <CriteriaRow i={1} label="周岁年龄">
                    <NumInput val={profile.age} onChange={v => pSet('age', v)} placeholder="岁" />
                    <RangeInput minVal={criteria.age_min} maxVal={criteria.age_max} onMin={v => cSet('age_min',v)} onMax={v => cSet('age_max',v)} unit="岁" />
                  </CriteriaRow>
                  <CriteriaRow i={2} label="身高 (cm)">
                    <NumInput val={profile.height} onChange={v => pSet('height', v)} placeholder="cm" />
                    <RangeInput minVal={criteria.height_min} maxVal={criteria.height_max} onMin={v => cSet('height_min',v)} onMax={v => cSet('height_max',v)} unit="cm" />
                  </CriteriaRow>
                  <CriteriaRow i={3} label="体重 (kg)">
                    <NumInput val={profile.weight} onChange={v => pSet('weight', v)} placeholder="kg" />
                    <RangeInput minVal={criteria.weight_min} maxVal={criteria.weight_max} onMin={v => cSet('weight_min',v)} onMax={v => cSet('weight_max',v)} unit="kg" />
                  </CriteriaRow>
                  <CriteriaRow i={4} label="税后年收入 (万)">
                    <NumInput val={profile.annual_income} onChange={v => pSet('annual_income', v)} placeholder="万元" step="0.1" />
                    <RangeInput minVal={criteria.income_min} maxVal={criteria.income_max} onMin={v => cSet('income_min',v)} onMax={v => cSet('income_max',v)} unit="万" step="0.1" />
                  </CriteriaRow>
                  <CriteriaRow i={5} label="婚姻状况">
                    <SelectInput val={profile.marital_status} opts={MARITAL_OPTIONS} onChange={v => pSet('marital_status', v)} />
                    <CheckboxGroup vals={criteria.marital_status || []} opts={MARITAL_OPTIONS} onChange={v => cSet('marital_status', toggleArr(criteria.marital_status||[], v))} />
                  </CriteriaRow>
                  <CriteriaRow i={6} label="目前居住区域">
                    <SelectInput val={profile.region} opts={REGION_OPTIONS} onChange={v => pSet('region', v)} placeholder="请选择区域" />
                    <TextInput val={criteria.region?.[0] || ''} onChange={v => cSet('region', v ? [v] : [])} placeholder="如：苏州，不限可留空" />
                  </CriteriaRow>
                  <CriteriaRow i={7} label="房产状况">
                    <SelectInput val={profile.property_status} opts={PROPERTY_OPTIONS} onChange={v => pSet('property_status', v)} />
                    <CheckboxGroup vals={criteria.property_status || []} opts={PROPERTY_OPTIONS} onChange={v => cSet('property_status', toggleArr(criteria.property_status||[], v))} />
                  </CriteriaRow>
                  <CriteriaRow i={8} label="职业与单位性质">
                    <SelectInput val={profile.job_type} opts={JOB_OPTIONS} onChange={v => pSet('job_type', v)} />
                    <CheckboxGroup vals={criteria.job_type || []} opts={JOB_OPTIONS} onChange={v => cSet('job_type', toggleArr(criteria.job_type||[], v))} />
                  </CriteriaRow>
                  <CriteriaRow i={9} label="最高学历">
                    <SelectInput val={profile.degree} opts={DEGREE_OPTIONS} onChange={v => pSet('degree', v)} />
                    <SelectInput val={criteria.degree} opts={DEGREE_OPTIONS} placeholder="不限" onChange={v => cSet('degree', v)} />
                  </CriteriaRow>
                  <CriteriaRow i={10} label="籍贯">
                    <TextInput val={profile.hometown} onChange={v => pSet('hometown', v)} placeholder="省/市" />
                    <TextInput val={(criteria.hometown as string) || ''} onChange={v => cSet('hometown', v)} placeholder="不限可留空" />
                  </CriteriaRow>
                  <CriteriaRow i={11} label="父母工作">
                    <CheckboxGroup vals={profile.parents_job || []} opts={PARENTS_JOB_OPTIONS} onChange={v => pSet('parents_job', toggleArr(profile.parents_job||[], v))} />
                    <CheckboxGroup vals={criteria.parents_job || []} opts={PARENTS_JOB_OPTIONS} onChange={v => cSet('parents_job', toggleArr(criteria.parents_job||[], v))} />
                  </CriteriaRow>
                  <CriteriaRow i={12} label="父母医社保">
                    <SelectInput val={profile.parents_insurance} opts={PARENTS_INS_OPTIONS} onChange={v => pSet('parents_insurance', v)} />
                    <SelectInput val={criteria.parents_insurance} opts={PARENTS_INS_OPTIONS} placeholder="不限" onChange={v => cSet('parents_insurance', v)} />
                  </CriteriaRow>
                  <CriteriaRow i={13} label="原生家庭结构">
                    <SelectInput val={profile.family_structure} opts={FAMILY_STR_OPTIONS} onChange={v => pSet('family_structure', v)} />
                    <SelectInput val={criteria.family_structure} opts={FAMILY_STR_OPTIONS} placeholder="不限" onChange={v => cSet('family_structure', v)} />
                  </CriteriaRow>
                  <CriteriaRow i={14} label="父母婚姻状况">
                    <SelectInput val={profile.parents_marital} opts={PARENTS_MARITAL_OPTIONS} onChange={v => pSet('parents_marital', v)} />
                    <SelectInput val={criteria.parents_marital} opts={PARENTS_MARITAL_OPTIONS} placeholder="不限" onChange={v => cSet('parents_marital', v)} />
                  </CriteriaRow>
                  <CriteriaRow i={15} label="吸烟">
                    <SelectInput val={profile.smoking} opts={SMOKING_OPTIONS} onChange={v => pSet('smoking', v)} />
                    <SelectInput val={criteria.smoking} opts={SMOKING_PREF_OPTIONS} placeholder="不限" onChange={v => cSet('smoking', v)} />
                  </CriteriaRow>
                  <CriteriaRow i={16} label="酗酒">
                    <SelectInput val={profile.drinking} opts={DRINKING_OPTIONS} onChange={v => pSet('drinking', v)} />
                    <SelectInput val={criteria.drinking} opts={DRINKING_PREF_OPTIONS} placeholder="不限" onChange={v => cSet('drinking', v)} />
                  </CriteriaRow>
                  <CriteriaRow i={17} label="作息规律">
                    <SelectInput val={profile.schedule} opts={SCHEDULE_OPTIONS} onChange={v => pSet('schedule', v)} />
                    <SelectInput val={criteria.schedule} opts={SCHEDULE_PREF_OPTIONS} placeholder="不限" onChange={v => cSet('schedule', v)} />
                  </CriteriaRow>
                  <CriteriaRow i={18} label="个人爱好">
                    <TagSelect vals={profile.hobbies || []} opts={HOBBIES_OPTIONS} onChange={v => pSet('hobbies', toggleArr(profile.hobbies||[], v))} />
                    <TagSelect vals={criteria.hobbies || []} opts={HOBBIES_OPTIONS} onChange={v => cSet('hobbies', toggleArr(criteria.hobbies||[], v))} />
                  </CriteriaRow>
                  <CriteriaRow i={19} label="性格特质">
                    <TagSelect vals={profile.personality || []} opts={PERSONALITY_OPTIONS} onChange={v => pSet('personality', toggleArr(profile.personality||[], v))} />
                    <TagSelect vals={criteria.personality || []} opts={PERSONALITY_OPTIONS} onChange={v => cSet('personality', toggleArr(criteria.personality||[], v))} />
                  </CriteriaRow>
                </tbody>
              </table>
            </div>
            {saveMsg && <p style={{ textAlign: 'center', color: saveMsg.startsWith('✅') ? '#27ae60' : '#e74c3c', margin: '16px 0 0', fontWeight: 600 }}>{saveMsg}</p>}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={handleSave} disabled={saving} style={{ padding: '12px 48px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab 2: 互相匹配 ── */}
        {activeTab === 'mutual' && (
          <div>
            <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#155724' }}>
              ✅ 互相匹配的校友可以直接查看对方联系方式，无需申请对接
            </div>
            {matchLoading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中…</div> :
            !profile.profile_completed ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: '48px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>尚未完善相亲与择偶条件</h3>
                <p style={{ color: '#64748b', fontSize: 13.5, maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.6 }}>
                  喜结连理采用严格的双向标准匹配。只有完善您的自身实际条件和期望择偶标准后，系统才能为您精准匹配合适的校友。
                </p>
                <button onClick={() => setActiveTab('criteria')} style={{
                  padding: '10px 24px', background: '#c0392b', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(192, 57, 43, 0.25)'
                }}>
                  前往填写择偶标准表格 →
                </button>
              </div>
            ) : mutual.length === 0 ? <EmptyState text="暂无互相匹配的校友，完善您的条件后再来看看~" /> :
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {mutual.map(m => (
                <div key={m.alumni_id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: isFemaleGender(m.gender) ? '#fce4ec' : '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: isFemaleGender(m.gender) ? '#c2185b' : '#1565c0', flexShrink: 0 }}>
                      {genderLabel(m.gender)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{m.display_name}</div>
                      <div style={{ color: '#888', fontSize: 12 }}>{genderLabel(m.gender)} · {m.age ? m.age + '岁' : '—'} · {m.height ? m.height + 'cm' : '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {m.region && <Tag>{m.region}</Tag>}
                    {m.degree && <Tag>{m.degree}</Tag>}
                    {m.job_type && <Tag>{m.job_type}</Tag>}
                  </div>
                  <div style={{ background: '#fff5f5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                    {m.phone && <div>📱 {m.phone}</div>}
                    {m.wechat_id && <div>💬 微信：{m.wechat_id}</div>}
                  </div>
                  <button onClick={() => setDetailModal(m)} style={{ width: '100%', padding: '8px 0', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>查看详情</button>
                </div>
              ))}
            </div>}
          </div>
        )}

        {/* ── Tab 3/4: 与我匹配 / 我匹配的 ── */}
        {(activeTab === 'them' || activeTab === 'me') && (
          <div>
            <div style={{ background: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#0c5460' }}>
              ℹ️ {activeTab === 'them' ? '以下校友符合您的择偶标准，但您不在对方的择偶标准范围内。可申请对接，由对方审核决定。' : '您符合以下校友的择偶标准，但对方不在您的择偶标准范围内。可申请对接，由对方审核决定。'}
            </div>
            {matchLoading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中…</div> :
            !profile.profile_completed ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: '48px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>尚未完善相亲与择偶条件</h3>
                <p style={{ color: '#64748b', fontSize: 13.5, maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.6 }}>
                  喜结连理采用严格的双向标准匹配。只有完善您的自身实际条件和期望择偶标准后，系统才能为您精准匹配合适的校友。
                </p>
                <button onClick={() => setActiveTab('criteria')} style={{
                  padding: '10px 24px', background: '#c0392b', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(192, 57, 43, 0.25)'
                }}>
                  前往填写择偶标准表格 →
                </button>
              </div>
            ) : (activeTab === 'them' ? them : me).length === 0 ? <EmptyState text="暂无匹配结果，完善条件后再来看看~" /> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(activeTab === 'them' ? them : me).map(m => {
                const conn = m.connection;
                const approved = conn?.approved;
                const myReqPending = conn?.myRequest?.status === 'PENDING';
                const myReqRejected = conn?.myRequest?.status === 'REJECTED';
                const theirReqPending = conn?.theirRequest?.status === 'PENDING';

                return (
                  <div
                    key={m.alumni_id}
                    style={{
                      background: theirReqPending && !approved ? 'linear-gradient(180deg, #fffbf5, #ffffff)' : '#fff',
                      borderRadius: 12,
                      padding: '16px 20px',
                      boxShadow: theirReqPending && !approved ? '0 4px 16px rgba(249, 115, 22, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                      border: theirReqPending && !approved ? '1.5px solid #f97316' : '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      position: 'relative',
                    }}
                  >
                    {theirReqPending && !approved && (
                      <div style={{
                        position: 'absolute',
                        top: -9,
                        right: 18,
                        background: '#f97316',
                        color: '#fff',
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 9px',
                        borderRadius: 10,
                        boxShadow: '0 2px 6px rgba(249, 115, 22, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}>
                        💌 待您审核
                      </div>
                    )}
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: isFemaleGender(m.gender) ? '#fce4ec' : '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: isFemaleGender(m.gender) ? '#c2185b' : '#1565c0', flexShrink: 0 }}>
                      {genderLabel(m.gender)}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.display_name}</div>
                      <div style={{ color: '#888', fontSize: 12 }}>
                        {genderLabel(m.gender)} · {m.age ? m.age + '岁' : ''} · {m.height ? m.height + 'cm' : ''}
                        {m.region ? ' | ' + m.region : ''}{m.degree ? ' | ' + m.degree : ''}{m.job_type ? ' | ' + m.job_type : ''}
                      </div>
                      {approved && <div style={{ marginTop: 6, fontSize: 12, color: '#27ae60', fontWeight: 600 }}>✅ 已对接 {m.phone ? '| 📱 ' + m.phone : ''} {m.wechat_id ? '| 💬 ' + m.wechat_id : ''}</div>}
                      {myReqPending && <div style={{ marginTop: 4, fontSize: 11, color: '#e67e22' }}>已申请，等待对方回应</div>}
                      {theirReqPending && !myReqPending && <div style={{ marginTop: 4, fontSize: 11, color: '#e67e22', fontWeight: 600 }}>对方已申请对接，点击审核</div>}
                    </div>
                    {!approved && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {myReqRejected ? (
                          <span style={{ padding: '7px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 12, color: '#999' }}>对方暂不考虑</span>
                        ) : myReqPending ? (
                          <button onClick={() => handleConnection('withdraw', m.alumni_id)} disabled={actionLoading} style={{ padding: '7px 14px', border: '1px solid #e67e22', borderRadius: 8, background: '#fff', color: '#e67e22', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>撤回申请</button>
                        ) : (
                          <button onClick={() => handleConnection('apply', m.alumni_id)} disabled={actionLoading} style={{ padding: '7px 14px', border: '1px solid #c0392b', borderRadius: 8, background: '#fff', color: '#c0392b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>申请对接</button>
                        )}
                        <button onClick={() => theirReqPending ? setReviewModal(m) : undefined} disabled={!theirReqPending || actionLoading} style={{ padding: '7px 14px', border: 'none', borderRadius: 8, background: theirReqPending ? '#e67e22' : '#e9ecef', color: theirReqPending ? '#fff' : '#aaa', cursor: theirReqPending ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, position: 'relative' }}>
                          审核对接{theirReqPending && <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, background: '#c0392b', borderRadius: '50%' }}></span>}
                        </button>
                      </div>
                    )}
                    {approved && (
                      <button onClick={() => setDetailModal(m)} style={{ padding: '7px 14px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>查看详情</button>
                    )}
                  </div>
                );
              })}
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CriteriaRow({ i, label, children }: { i: number; label: string; children: React.ReactNode }) {
  const [left, right] = Array.isArray(children) ? children : [children, null];
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '10px 12px', color: '#999', fontSize: 12, textAlign: 'center' }}>{i}</td>
      <td style={{ padding: '10px 12px', fontWeight: 500, whiteSpace: 'nowrap', color: '#333' }}>{label}</td>
      <td style={{ padding: '10px 12px' }}>{left}</td>
      <td style={{ padding: '10px 12px' }}>{right}</td>
    </tr>
  );
}

function NumInput({ val, onChange, placeholder, step }: any) {
  return <input type="number" value={val || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} placeholder={placeholder} step={step} style={{ width: 100, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />;
}

function RangeInput({ minVal, maxVal, onMin, onMax, unit, step }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input type="number" value={minVal || ''} onChange={e => onMin(e.target.value ? Number(e.target.value) : null)} placeholder="最小" step={step} style={{ width: 72, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
      <span style={{ color: '#999', fontSize: 12 }}>～</span>
      <input type="number" value={maxVal || ''} onChange={e => onMax(e.target.value ? Number(e.target.value) : null)} placeholder="最大" step={step} style={{ width: 72, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
      {unit && <span style={{ color: '#999', fontSize: 12 }}>{unit}</span>}
    </div>
  );
}

function SelectInput({ val, opts, onChange, placeholder }: any) {
  const emptyLabel = placeholder || '请选择';
  const isNoLimit = emptyLabel === '不限';
  const selectedVal = (!val || (isNoLimit && val === '不限')) ? '' : val;

  return (
    <select
      value={selectedVal}
      onChange={e => {
        const raw = e.target.value;
        onChange(raw ? raw : (isNoLimit ? null : null));
      }}
      style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, maxWidth: 200 }}
    >
      <option value="">{emptyLabel}</option>
      {opts.filter((o: string) => o !== emptyLabel && o !== '不限').map((o: string) => (
        <option key={o} value={o}>{o}</option>
      ))}
      {val && !opts.includes(val) && val !== emptyLabel && val !== '不限' && (
        <option key={val} value={val}>{val}</option>
      )}
    </select>
  );
}

function TextInput({ val, onChange, placeholder }: any) {
  return <input type="text" value={val || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, width: 180 }} />;
}

function CheckboxGroup({ vals, opts, onChange }: any) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {opts.map((o: string) => (
        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: vals.includes(o) ? '#c0392b' : '#555' }}>
          <input type="checkbox" checked={vals.includes(o)} onChange={() => onChange(o)} style={{ margin: 0 }} />{o}
        </label>
      ))}
    </div>
  );
}

function TagSelect({ vals, opts, onChange }: any) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {opts.map((o: string) => (
        <button key={o} onClick={() => onChange(o)} style={{ padding: '3px 10px', border: `1px solid ${vals.includes(o) ? '#c0392b' : '#ddd'}`, borderRadius: 20, background: vals.includes(o) ? '#fff0f0' : '#f8f9fa', color: vals.includes(o) ? '#c0392b' : '#666', fontSize: 12, cursor: 'pointer', fontWeight: vals.includes(o) ? 600 : 400 }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Tag({ children }: any) {
  return <span style={{ padding: '2px 8px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 12, fontSize: 11, color: '#666' }}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: '48px 20px', color: '#aaa' }}><div style={{ fontSize: 40 }}>💞</div><p style={{ marginTop: 12, fontSize: 14 }}>{text}</p></div>;
}

function ProfileDetailTable({ m, showContact }: { m: any; showContact: boolean }) {
  if (!m) return null;

  const parseSafeArray = (val: any) => {
    if (!val) return '—';
    if (Array.isArray(val)) return val.length > 0 ? val.join('、') : '—';
    const parsed = parseJ(val);
    if (parsed.length > 0) return parsed.join('、');
    return String(val);
  };

  const rows: [string, any][] = [
    ['姓名', (showContact ? (m.name || m.display_name) : (m.display_name || m.name)) || '—'],
    ['性别', genderLabel(m.gender)],
    ['周岁年龄', m.age ? m.age + ' 岁' : '—'],
    ['身高', m.height ? m.height + ' cm' : '—'],
    ['体重', m.weight ? m.weight + ' kg' : '—'],
    ['婚姻状况', m.marital_status || '—'],
    ['居住区域', m.region || '—'],
    ['房产状况', m.property_status || '—'],
    ['税后年收入', m.annual_income ? m.annual_income + ' 万元' : '—'],
    ['职业性质', m.job_type || '—'],
    ['最高学历', m.degree || '—'],
    ['籍贯', m.hometown || '—'],
    ['原生家庭', m.family_structure || '—'],
    ['父母婚姻', m.parents_marital || '—'],
    ['吸烟', m.smoking || '—'],
    ['饮酒', m.drinking || '—'],
    ['作息', m.schedule || '—'],
    ['个人爱好', parseSafeArray(m.hobbies)],
    ['性格特质', parseSafeArray(m.personality)],
  ];
  if (showContact) {
    rows.push(['手机号', m.phone || '—']);
    rows.push(['微信号', m.wechat_id || '—']);
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map(([label, val]) => (
          <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ padding: '7px 10px', color: '#888', whiteSpace: 'nowrap', width: 100 }}>{label}</td>
            <td style={{ padding: '7px 10px', color: '#333' }}>{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
