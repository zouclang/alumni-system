'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

const MapChart = dynamic(() => import('@/components/MapCharts'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
      <div className="spinner" />
      <span style={{ marginLeft: '10px', fontSize: '12px' }}>地图加载中...</span>
    </div>
  )
});

interface CockpitData {
  overview: {
    totalAlumni: number;
    verifiedUsers: number;
    councilCount: number;
    jobCount: number;
    activeJobCount: number;
    jobCompanies: number;
    totalApplications: number;
    singleCount: number;
    mutualMatchCount: number;
    oneWayMatchCount: number;
    connectionCount: number;
    approvedConnections: number;
    wechatGroupCount: number;
    collegeCount?: number;
  };
  enterprises?: {
    totalAlumniWithCompany: number;
    totalCompanies: number;
    topCompaniesWith5Plus: { company: string; count: number }[];
    industryClusters: { name: string; icon: string; color: string; desc: string; count: number; percent: number }[];
  };
  council: {
    total: number;
    byRole: { role: string; count: number }[];
    members: { id: number; name: string; association_role: string; college: string; company: string; position: string; region: string }[];
  };
  jobs: {
    totalPostings: number;
    activePostings: number;
    totalCompanies: number;
    totalApplications: number;
    bySalary: { range: string; count: number }[];
    byType: { type: string; count: number }[];
    recentJobs: { id: number; job_title: string; company_name: string; location: string; salary_range: string; job_type: string; status: string }[];
  };
  matchmaking: {
    totalActive: number;
    males: number;
    females: number;
    mutualMatches: number;
    oneWayMatches: number;
    connections: { total: number; approved: number; pending: number; rejected: number; withdrawn: number };
    byAgeGroup: { group: string; count: number }[];
    byDegree: { degree: string; count: number }[];
  };
  macro: {
    byHometown: { hometown: string; count: number }[];
    byRegion: { region: string; count: number }[];
    byCollege: { college: string; count: number }[];
    byDegree: { degree: string; count: number }[];
    byGender: { gender: string; count: number }[];
    byCareerType: { career_type: string; count: number }[];
    byWechatGroup: { group: string; count: number }[];
    byIndustry: { industry: string; count: number }[];
  };
}

const NEON_COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#2dd4bf'];
const CAREER_COLORS = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function CockpitPage() {
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeMap, setActiveMap] = useState<'suzhou' | 'china'>('suzhou');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cockpitRef = useRef<HTMLDivElement>(null);

  // Top 5 origin provinces derived from macro.byHometown
  const topProvinces = useMemo(() => {
    if (!data?.macro?.byHometown) return [];
    const map: Record<string, number> = {};
    data.macro.byHometown.forEach(h => {
      let prov = (h.hometown || '').split('-')[0].trim();
      if (!prov) return;
      map[prov] = (map[prov] || 0) + (h.count || 0);
    });
    return Object.entries(map)
      .map(([province, count]) => ({ province, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data?.macro?.byHometown]);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const str = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        hour12: false
      });
      setCurrentTime(str);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data with silent auto-refresh
  const fetchData = async (isSilent = false) => {
    if (!isSilent && !data) setLoading(true);
    try {
      const res = await fetch(`/api/cockpit?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    document.title = '数据驾驶舱 - 大工苏州校友会';
    fetchData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);

    const handleFocus = () => {
      fetchData(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      cockpitRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (loading && !data) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#060a17',
        color: '#38bdf8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
        <div style={{ marginTop: '16px', fontSize: '16px', letterSpacing: '2px' }}>
          正在加载校友大数据驾驶舱...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#060a17', color: '#f87171', padding: '40px', textAlign: 'center' }}>
        <h2>数据驾驶舱加载失败</h2>
        <button onClick={() => fetchData()} style={{ marginTop: '16px', padding: '8px 20px', background: '#1e293b', color: '#fff', border: '1px solid #38bdf8', borderRadius: '6px', cursor: 'pointer' }}>
          重新重试
        </button>
      </div>
    );
  }

  const { overview, enterprises, council, jobs, matchmaking, macro } = data;

  return (
    <div
      ref={cockpitRef}
      className={`cockpit-container ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* Dynamic Background Grid Pattern */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* 1. TOP COMPACT HEADER */}
      <header className="cockpit-header">
        {/* Brand & Title */}
        <div className="header-brand">
          <div className="header-logo-badge">
            <img src="/logo.png" alt="Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 className="header-title">
              大连理工大学苏州校友会 · 大数据驾驶舱
            </h1>
            <div className="header-subtitle">
              ALUMNI BIG DATA COCKPIT · SMART GOVERNANCE
            </div>
          </div>
        </div>

        {/* Center Clock & Status */}
        <div className="header-clock-status">
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
            {currentTime}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>|</span>
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>实时在线</span>
        </div>

        {/* Action Controls */}
        <div className="header-actions">
          <button
            onClick={() => fetchData()}
            title="刷新数据"
            className="action-btn"
          >
            <span>🔄</span> 刷新
          </button>
          <button
            onClick={toggleFullscreen}
            title="全屏演示模式"
            className="action-btn-primary"
          >
            <span>{isFullscreen ? '🗗' : '🖥️'}</span> {isFullscreen ? '退出全屏' : '全屏演示'}
          </button>
        </div>
      </header>

      {/* 2. TOP KPI RIBBON (6 Compact Glowing Cards) */}
      <div className="kpi-ribbon">
        {/* 1. Alumni Total */}
        <div className="cockpit-card kpi-card" style={{ borderLeft: '3px solid #38bdf8' }}>
          <div className="kpi-icon" style={{ color: '#38bdf8' }}>📋</div>
          <div className="kpi-info">
            <div className="kpi-label">校友总规模</div>
            <div className="kpi-value" style={{ color: '#38bdf8' }}>{overview.totalAlumni.toLocaleString()}</div>
            <div className="kpi-sub">已实名认证: <span style={{ color: '#38bdf8' }}>{overview.verifiedUsers}</span> 人</div>
          </div>
        </div>

        {/* 2. Council */}
        <div className="cockpit-card kpi-card" style={{ borderLeft: '3px solid #fbbf24' }}>
          <div className="kpi-icon" style={{ color: '#fbbf24' }}>🏛️</div>
          <div className="kpi-info">
            <div className="kpi-label">理事会成员</div>
            <div className="kpi-value" style={{ color: '#fbbf24' }}>{overview.councilCount}</div>
            <div className="kpi-sub">理事长/秘书长/专委会</div>
          </div>
        </div>

        {/* 3. Wechat Groups (新增：微信社群数) */}
        <div className="cockpit-card kpi-card" style={{ borderLeft: '3px solid #2dd4bf' }}>
          <div className="kpi-icon" style={{ color: '#2dd4bf' }}>💬</div>
          <div className="kpi-info">
            <div className="kpi-label">微信社群数</div>
            <div className="kpi-value" style={{ color: '#2dd4bf' }}>
              {overview.wechatGroupCount || macro.byWechatGroup.length} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>个</span>
            </div>
            <div className="kpi-sub">行业/兴趣/年级全覆盖</div>
          </div>
        </div>

        {/* 4. Covered Colleges (新增：覆盖学院数) */}
        <div className="cockpit-card kpi-card" style={{ borderLeft: '3px solid #a855f7' }}>
          <div className="kpi-icon" style={{ color: '#a855f7' }}>🎓</div>
          <div className="kpi-info">
            <div className="kpi-label">覆盖学院数</div>
            <div className="kpi-value" style={{ color: '#a855f7' }}>
              {overview.collegeCount || macro.byCollege.length} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>个</span>
            </div>
            <div className="kpi-sub">涵盖理工管文优势专业</div>
          </div>
        </div>

        {/* 5. Jobs */}
        <div className="cockpit-card kpi-card" style={{ borderLeft: '3px solid #34d399' }}>
          <div className="kpi-icon" style={{ color: '#34d399' }}>🤝</div>
          <div className="kpi-info">
            <div className="kpi-label">连理招聘岗位</div>
            <div className="kpi-value" style={{ color: '#34d399' }}>{overview.jobCount}</div>
            <div className="kpi-sub">在招: <span style={{ color: '#34d399' }}>{overview.activeJobCount}</span> / 名企: {overview.jobCompanies}</div>
          </div>
        </div>

        {/* 6. Singles (入驻单身校友，互配单向以小字显示) */}
        <div className="cockpit-card kpi-card" style={{ borderLeft: '3px solid #f472b6' }}>
          <div className="kpi-icon" style={{ color: '#f472b6' }}>💞</div>
          <div className="kpi-info">
            <div className="kpi-label">入驻单身校友</div>
            <div className="kpi-value" style={{ color: '#f472b6' }}>
              {overview.singleCount} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#cbd5e1' }}>位</span>
              <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#94a3b8', marginLeft: '6px' }}>
                (男{matchmaking.males}/女{matchmaking.females})
              </span>
            </div>
            <div className="kpi-sub" style={{ fontSize: '9px', whiteSpace: 'nowrap', display: 'flex', gap: '4px' }}>
              <span>互配:<strong style={{ color: '#fbbf24' }}>{overview.mutualMatchCount}</strong>对</span>
              <span>·</span>
              <span>单向:<strong style={{ color: '#38bdf8' }}>{overview.oneWayMatchCount}</strong>对</span>
              <span>·</span>
              <span>牵手:<strong style={{ color: '#34d399' }}>{overview.approvedConnections}</strong>对</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN 3-COLUMN COCKPIT (Fills Remaining Screen Height) */}
      <div className="cockpit-grid">

        {/* LEFT COLUMN: 社群矩阵与重点生源学院画像 (双卡片均分，充满整列无留白) */}
        <div className="cockpit-col left-col">

          {/* 1. 各微信群人数对照 (带交互清晰 Tooltip) */}
          <div className="cockpit-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 12px' }}>
            <div className="card-header" style={{ paddingBottom: '4px', flexShrink: 0 }}>
              <span className="card-title">💬 各微信群人数对照</span>
              <span className="card-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                {macro.byWechatGroup.length} 个社群
              </span>
            </div>
            <div className="chart-box-flex">
              <div className="chart-box-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={macro.byWechatGroup.slice(0, 10)}
                    margin={{ top: 4, right: 25, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis type="category" dataKey="group" stroke="#64748b" tick={{ fill: '#e2e8f0', fontSize: 10 }} width={68} />
                    <Tooltip
                      cursor={{ fill: 'rgba(56, 189, 248, 0.12)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid #38bdf8',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              pointerEvents: 'none'
                            }}>
                              <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '12px' }}>
                                💬 {d.group}
                              </div>
                              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>
                                群内校友：<strong style={{ color: '#34d399', fontSize: '13px' }}>{d.count}</strong> 人
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {macro.byWechatGroup.slice(0, 10).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={NEON_COLORS[index % NEON_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 2. 学院分布 Top 10 (带交互清晰 Tooltip) */}
          <div className="cockpit-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 12px' }}>
            <div className="card-header" style={{ paddingBottom: '4px', flexShrink: 0 }}>
              <span className="card-title">🎓 毕业生源学院分布</span>
              <span className="card-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                覆盖 {overview.collegeCount || macro.byCollege.length} 学院
              </span>
            </div>
            <div className="chart-box-flex">
              <div className="chart-box-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={macro.byCollege}
                    margin={{ top: 4, right: 25, left: 15, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis type="category" dataKey="college" stroke="#64748b" tick={{ fill: '#e2e8f0', fontSize: 10 }} width={82} />
                    <Tooltip
                      cursor={{ fill: 'rgba(192, 132, 252, 0.12)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid #c084fc',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              pointerEvents: 'none'
                            }}>
                              <div style={{ color: '#c084fc', fontWeight: 700, fontSize: '12px' }}>
                                🎓 {d.college}
                              </div>
                              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>
                                就读校友：<strong style={{ color: '#38bdf8', fontSize: '13px' }}>{d.count}</strong> 人
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {macro.byCollege.map((_, index) => (
                        <Cell key={`college-cell-${index}`} fill={NEON_COLORS[(index + 3) % NEON_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

        {/* CENTER COLUMN: 空间热力中枢与宏观画像 */}
        <div className="cockpit-col center-col">

          {/* 1. 地图时空热力中心 (自适应撑满高度，显著拉高视觉空间) */}
          <div className="cockpit-card map-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 12px' }}>
            <div className="card-header" style={{ paddingBottom: '4px', flexShrink: 0 }}>
              <span className="card-title">🗺️ 校友空间热力与分布</span>

              {/* Map switcher tabs */}
              <div style={{
                display: 'flex',
                background: 'rgba(2, 6, 23, 0.6)',
                padding: '2px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.2)'
              }}>
                <button
                  onClick={() => setActiveMap('suzhou')}
                  style={{
                    background: activeMap === 'suzhou' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                    color: activeMap === 'suzhou' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: activeMap === 'suzhou' ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none'
                  }}
                >
                  📍 苏州各区县热力
                </button>
                <button
                  onClick={() => setActiveMap('china')}
                  style={{
                    background: activeMap === 'china' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                    color: activeMap === 'china' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: activeMap === 'china' ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none'
                  }}
                >
                  🇨🇳 全国原籍分布
                </button>
              </div>
            </div>

            {/* Map Container - fills all available flex height */}
            <div className="map-wrapper" style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                {activeMap === 'suzhou' ? (
                  <MapChart
                    key="suzhou-map"
                    data={macro.byRegion.map(r => ({ name: r.region, value: r.count }))}
                    type="suzhou"
                    title=""
                    dark={true}
                    height="100%"
                  />
                ) : (
                  <MapChart
                    key="china-map"
                    data={macro.byHometown.map(h => ({ name: h.hometown, value: h.count }))}
                    type="china"
                    title=""
                    dark={true}
                    height="100%"
                  />
                )}
              </div>
            </div>

            {/* District / Province Ranking quick strip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              overflowX: 'auto',
              gap: '8px',
              flexShrink: 0,
              marginTop: '4px'
            }}>
              {activeMap === 'suzhou' ? (
                <>
                  <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>📍 重点区：</span>
                  {macro.byRegion.slice(0, 5).map((reg, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '10px', color: '#cbd5e1' }}>{reg.region}</span>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>{reg.count}人</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>🇨🇳 重点生源省：</span>
                  {topProvinces.map((prov, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '10px', color: '#cbd5e1' }}>{prov.province}</span>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>{prov.count}人</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 2. 事业类型与宏观结构 (Donut) - 整体下移 */}
          <div className="cockpit-card career-card" style={{ padding: '8px 12px', flexShrink: 0 }}>
            <div className="card-header" style={{ paddingBottom: '4px' }}>
              <span className="card-title">💼 事业类型分布</span>
              <span className="card-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                多元化职场格局
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', alignItems: 'center', height: '120px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macro.byCareerType}
                    dataKey="count"
                    nameKey="career_type"
                    innerRadius={32}
                    outerRadius={52}
                    paddingAngle={3}
                  >
                    {macro.byCareerType.map((_, index) => (
                      <Cell key={`career-cell-${index}`} fill={CAREER_COLORS[index % CAREER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#34d399', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} 人`, '校友数']}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend List with percentage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                {(() => {
                  const totalCareer = macro.byCareerType.reduce((acc, c) => acc + c.count, 0) || 1;
                  return macro.byCareerType.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: CAREER_COLORS[idx % CAREER_COLORS.length] }} />
                        <span style={{ color: '#cbd5e1' }}>{item.career_type.length > 8 ? item.career_type.slice(0, 8) + '..' : item.career_type}</span>
                      </div>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>
                        {item.count}人 <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'normal' }}>({Math.round(item.count / totalCareer * 100)}%)</span>
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* 3. 性别比例与最高学历双环并列 - 整体下移至最底部 */}
          <div className="macro-dual-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flexShrink: 0 }}>
            
            {/* 性别比例 */}
            <div className="cockpit-card" style={{ padding: '6px 10px' }}>
              <div className="card-header" style={{ paddingBottom: '3px' }}>
                <span className="card-title" style={{ fontSize: '11px' }}>👥 性别比例</span>
              </div>
              <div style={{ height: '95px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macro.byGender}
                      dataKey="count"
                      nameKey="gender"
                      innerRadius={20}
                      outerRadius={36}
                      paddingAngle={4}
                    >
                      {macro.byGender.map((entry, index) => (
                        <Cell key={`gender-${index}`} fill={entry.gender === '男' ? '#38bdf8' : '#f43f5e'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#38bdf8', borderRadius: '6px', fontSize: '10px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', color: '#cbd5e1', paddingTop: '2px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 最高学历分布 */}
            <div className="cockpit-card" style={{ padding: '6px 10px' }}>
              <div className="card-header" style={{ paddingBottom: '3px' }}>
                <span className="card-title" style={{ fontSize: '11px' }}>📚 最高学历分布</span>
              </div>
              <div style={{ height: '95px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macro.byDegree}
                      dataKey="count"
                      nameKey="degree"
                      innerRadius={20}
                      outerRadius={36}
                      paddingAngle={4}
                    >
                      {macro.byDegree.map((_, index) => (
                        <Cell key={`deg-${index}`} fill={NEON_COLORS[(index + 2) % NEON_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#c084fc', borderRadius: '6px', fontSize: '10px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', color: '#cbd5e1', paddingTop: '2px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: 校友企业生态 & 连理招聘 & 喜结连理婚恋专项 */}
        <div className="cockpit-col right-col">

          {/* 1. 🏢 校友名企集聚与行业生态 (新增：分析整个校友企业，含行业分布与5人以上企业) */}
          <div className="cockpit-card enterprise-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 12px' }}>
            <div className="card-header" style={{ paddingBottom: '4px', flexShrink: 0 }}>
              <span className="card-title">🏢 校友名企集聚与行业生态</span>
              <span className="card-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                {enterprises?.topCompaniesWith5Plus?.length || 37} 家重点名企 (≥5人)
              </span>
            </div>

            {/* 核心产业集群 (类似招商方案格局) */}
            <div style={{ marginTop: '4px', marginBottom: '5px', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏭 核心产业生态集群：</span>
                <span style={{ color: '#38bdf8', fontSize: '9px' }}>覆盖 1,200+ 在苏企事业单位</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {(enterprises?.industryClusters || []).slice(0, 3).map((ind, idx) => (
                  <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '3px 5px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)', minWidth: 0 }}>
                    <div style={{ fontSize: '9px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, gap: '2px' }}>
                      <span title={ind.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
                        {ind.icon} {ind.name}
                      </span>
                      <strong style={{ color: ind.color, fontSize: '9.5px', marginLeft: '2px', flexShrink: 0 }}>{ind.count}人</strong>
                    </div>
                    <div style={{ height: '3px', width: '100%', background: '#1e293b', borderRadius: '2px', marginTop: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${ind.percent}%`, background: ind.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5人以上名企矩阵 (微型发光胶囊标签，支持动态扩充展示空间) */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span>🏆 校友集聚重点企业 (≥5人)：</span>
                <span style={{ fontSize: '9px', color: '#34d399' }}>汇川/博世/热工院/苏大等</span>
              </div>
              <div style={{
                flex: 1,
                minHeight: '70px',
                maxHeight: '175px',
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                alignContent: 'flex-start',
                gap: '4px',
                paddingRight: '2px'
              }}>
                {(enterprises?.topCompaniesWith5Plus || []).map((item, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(30, 41, 59, 0.55)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '9.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{ color: '#e2e8f0' }}>{item.company}</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', padding: '0 4px', borderRadius: '3px' }}>
                      {item.count}人
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. 连理招聘·人才职场生态 */}
          <div className="cockpit-card job-card" style={{ padding: '6px 12px 8px', flexShrink: 0 }}>
            <div className="card-header" style={{ paddingBottom: '4px' }}>
              <span className="card-title">🤝 连理招聘·人才生态</span>
              <span className="card-badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                在招 {jobs.activePostings} 岗 / 投递 {jobs.totalApplications} 人次
              </span>
            </div>

            {/* Salary Breakdown Chart */}
            <div style={{ marginTop: '3px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                <span>💰 薪资区间分布梯队：</span>
                <span style={{ color: '#34d399', fontSize: '9px' }}>合作名企: {jobs.totalCompanies} 家</span>
              </div>
              <div style={{ height: '78px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobs.bySalary.length > 0 ? jobs.bySalary : [{ range: '面议/其他', count: 1 }]} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="range" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(52, 211, 153, 0.12)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid #34d399',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              pointerEvents: 'none'
                            }}>
                              <div style={{ color: '#34d399', fontWeight: 700 }}>💰 {d.range}</div>
                              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>开放岗位：<strong style={{ color: '#38bdf8' }}>{d.count}</strong> 个</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#34d399" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Job Openings List */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>最新发布优质岗位：</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {jobs.recentJobs.slice(0, 2).map(j => (
                  <div key={j.id} style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0' }}>{j.job_title}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>{j.company_name} · {j.location}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#34d399' }}>{j.salary_range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. 喜结连理·婚恋交友专题看板 */}
          <div className="cockpit-card match-card" style={{ flex: 1.15, display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 12px', minHeight: 0 }}>
            <div className="card-header" style={{ paddingBottom: '4px', flexShrink: 0 }}>
              <span className="card-title">💞 喜结连理·婚恋交友专题</span>
              <span className="card-badge" style={{ background: 'rgba(244, 114, 182, 0.15)', color: '#f472b6' }}>
                入驻 {matchmaking.totalActive} 位单身校友
              </span>
            </div>

            {/* 配对核心亮点仪表盘 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(129, 140, 248, 0.12) 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(244, 114, 182, 0.3)',
              padding: '6px 10px',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '10px', color: '#f472b6', fontWeight: 600, marginBottom: '4px' }}>
                💘 智能算法契合配对雷达：
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '5px 8px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#cbd5e1' }}>互相匹配 (算法满足)</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24', margin: '1px 0' }}>
                    {matchmaking.mutualMatches}
                  </div>
                  <div style={{ fontSize: '9px', color: '#34d399' }}>双向完全契合 · 自动解锁</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '5px 8px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#cbd5e1' }}>单向匹配 (算法满足)</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#38bdf8', margin: '1px 0' }}>
                    {matchmaking.oneWayMatches}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>单方满足条件 · A → B</div>
                </div>
              </div>
            </div>

            {/* 牵手进度流 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              textAlign: 'center',
              flexShrink: 0
            }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '3px 4px', borderRadius: '5px' }}>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>发起心动</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>{matchmaking.connections.total}</div>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '3px 4px', borderRadius: '5px' }}>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>待审核/沟通</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fbbf24' }}>{matchmaking.connections.pending}</div>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '3px 4px', borderRadius: '5px' }}>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>对接成功</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#34d399' }}>{matchmaking.connections.approved}</div>
              </div>
            </div>

            {/* 单身年龄层分布 */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <span>🎂 单身校友年龄梯队：</span>
                <span style={{ color: '#f472b6', fontSize: '9px' }}>90/95/00后为主力群体</span>
              </div>
              <div style={{ flex: 1, minHeight: '85px', maxHeight: '120px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={matchmaking.byAgeGroup} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="group" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(244, 114, 182, 0.12)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid #f472b6',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              pointerEvents: 'none'
                            }}>
                              <div style={{ color: '#f472b6', fontWeight: 700 }}>
                                🎂 {d.group} {d.group === '待完善' ? '(未填相亲表)' : ''}
                              </div>
                              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>
                                {d.group === '待完善' ? '待完善资料校友：' : '单身校友：'}
                                <strong style={{ color: '#fbbf24' }}>{d.count}</strong> 人
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#f472b6" radius={[3, 3, 0, 0]}>
                      {matchmaking.byAgeGroup.map((_, index) => (
                        <Cell key={`age-${index}`} fill={['#f472b6', '#ec4899', '#c084fc', '#a855f7', '#818cf8', '#64748b'][index % 6]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 底部新增：单身高素质画像 & 真实交友生态面板 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '6px',
              border: '1px solid rgba(244, 114, 182, 0.25)',
              padding: '6px 10px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#e2e8f0' }}>
                  💎 单身校友画像与高素质学历构成
                </span>
                <span style={{ fontSize: '9px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  🛡️ 100% 真实认证
                </span>
              </div>

              {/* 男女比例进度条 */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#cbd5e1', marginBottom: '3px' }}>
                  <span>♂ 男校友: <strong style={{ color: '#38bdf8' }}>{matchmaking.males}</strong> 人 ({matchmaking.totalActive ? Math.round(matchmaking.males / matchmaking.totalActive * 100) : 0}%)</span>
                  <span>♀ 女校友: <strong style={{ color: '#f472b6' }}>{matchmaking.females}</strong> 人 ({matchmaking.totalActive ? Math.round(matchmaking.females / matchmaking.totalActive * 100) : 0}%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{
                    width: `${matchmaking.totalActive ? (matchmaking.males / matchmaking.totalActive) * 100 : 50}%`,
                    background: 'linear-gradient(90deg, #0284c7, #38bdf8)'
                  }} />
                  <div style={{
                    width: `${matchmaking.totalActive ? (matchmaking.females / matchmaking.totalActive) * 100 : 50}%`,
                    background: 'linear-gradient(90deg, #ec4899, #f472b6)'
                  }} />
                </div>
              </div>

              {/* 学历层次标签与特色 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {matchmaking.byDegree && matchmaking.byDegree.length > 0 ? (
                    matchmaking.byDegree.map((item, idx) => (
                      <span key={idx} style={{
                        background: 'rgba(192, 132, 252, 0.12)',
                        border: '1px solid rgba(192, 132, 252, 0.25)',
                        color: '#c084fc',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 600
                      }}>
                        🎓 {item.degree} {item.count}人
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>🎓 硕博高知校友占主流</span>
                  )}
                </div>
                <div style={{ fontSize: '9px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                  ✨ 相同校友底色 · 优质良缘
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* EMBEDDED STYLES FOR FULL-VIEWPORT ZERO-SCROLL COCKPIT */}
      <style jsx>{`
        .cockpit-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          z-index: 99999;
          overflow: hidden;
          background: radial-gradient(ellipse at 50% 0%, #0d1e3d 0%, #070d1e 60%, #03050d 100%);
          color: #e2e8f0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0 !important;
          padding: 8px 12px 10px !important;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .cockpit-header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.45) 100%);
          border-radius: 8px;
          border: 1px solid rgba(56, 189, 248, 0.22);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          margin-bottom: 8px;
          flex-shrink: 0;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-logo-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
          flex-shrink: 0;
        }

        .header-title {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.8px;
          background: linear-gradient(90deg, #ffffff 0%, #67e8f9 50%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1.2;
        }

        .header-subtitle {
          font-size: 9px;
          color: #94a3b8;
          letter-spacing: 0.6px;
        }

        .header-clock-status {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(2, 6, 23, 0.7);
          padding: 4px 12px;
          border-radius: 16px;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-btn {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38bdf8;
          color: #ffffff;
        }

        .action-btn-primary {
          background: linear-gradient(135deg, rgba(2, 132, 199, 0.4) 0%, rgba(56, 189, 248, 0.4) 100%);
          border: 1px solid #38bdf8;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
          transition: all 0.2s;
        }

        .action-btn-primary:hover {
          background: linear-gradient(135deg, rgba(2, 132, 199, 0.6) 0%, rgba(56, 189, 248, 0.6) 100%);
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.6);
        }

        .kpi-ribbon {
          position: relative;
          zIndex: 2;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-bottom: 8px;
          flex-shrink: 0;
        }

        .cockpit-grid {
          position: relative;
          zIndex: 2;
          display: grid;
          grid-template-columns: 1.15fr 1.6fr 1.15fr;
          gap: 8px;
          align-items: stretch;
          flex: 1;
          min-height: 0;
          height: 100%;
        }

        .cockpit-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
          height: 100%;
        }

        .chart-box-flex {
          flex: 1;
          min-height: 0;
          width: 100%;
          position: relative;
          margin-top: 4px;
        }

        .chart-box-inner {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .cockpit-card {
          background: rgba(13, 22, 41, 0.76);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(56, 189, 248, 0.16);
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .cockpit-card:hover {
          border-color: rgba(56, 189, 248, 0.3);
        }

        .enterprise-card ::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }
        .enterprise-card ::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.3);
          border-radius: 3px;
        }

        .cockpit-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.4), transparent);
        }

        .kpi-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        }

        .kpi-icon {
          font-size: 19px;
          background: rgba(15, 23, 42, 0.65);
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .kpi-info {
          flex: 1;
          min-width: 0;
        }

        .kpi-label {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kpi-value {
          font-size: 20px;
          font-weight: 800;
          line-height: 1.1;
          font-family: 'Inter', -apple-system, sans-serif;
          letter-spacing: -0.3px;
          margin: 1px 0;
        }

        .kpi-sub {
          font-size: 9px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 5px;
        }

        .card-title {
          font-size: 12px;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: 0.4px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .card-badge {
          font-size: 9px;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 10px;
          border: 1px solid currentColor;
        }

        .cockpit-container.is-fullscreen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999999;
          margin: 0 !important;
          padding: 10px 14px 12px !important;
        }

        /* 📱 RESPONSIVE DESIGN FOR TABLETS & PHONES */
        @media (max-width: 1024px) {
          .cockpit-container {
            position: relative !important;
            height: auto !important;
            min-height: 100vh !important;
            max-height: none !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: 10px 10px 30px !important;
            gap: 10px !important;
          }

          .cockpit-header {
            flex-wrap: wrap !important;
            gap: 8px !important;
            padding: 8px 12px !important;
          }

          .header-brand {
            width: 100% !important;
            justify-content: space-between !important;
          }

          .kpi-ribbon {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
          }

          .cockpit-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            height: auto !important;
          }

          .cockpit-col {
            height: auto !important;
            gap: 10px !important;
          }

          /* Mobile visual priority: Center (Map) first, then Left (Groups), then Right (Jobs/Match) */
          .center-col {
            order: 1 !important;
            height: auto !important;
            min-height: auto !important;
          }

          .left-col {
            order: 2 !important;
            height: auto !important;
            min-height: auto !important;
          }

          .right-col {
            order: 3 !important;
            height: auto !important;
            min-height: auto !important;
          }

          .chart-box-flex {
            height: 250px !important;
            min-height: 250px !important;
          }

          .map-card {
            min-height: 380px !important;
          }

          .map-wrapper {
            height: 320px !important;
            min-height: 320px !important;
          }

          .cockpit-card {
            min-height: auto !important;
          }
        }

        @media (max-width: 640px) {
          .kpi-ribbon {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }

          .header-title {
            font-size: 14px !important;
          }

          .header-subtitle {
            display: none !important;
          }

          .header-clock-status {
            display: none !important;
          }

          .header-actions {
            width: 100% !important;
            justify-content: flex-end !important;
          }

          .macro-dual-row {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .map-card {
            min-height: 340px !important;
          }

          .map-wrapper {
            height: 280px !important;
            min-height: 280px !important;
          }
        }
      `}</style>
    </div>
  );
}
