'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend
} from 'recharts';
import dynamic from 'next/dynamic';

const MapChart = dynamic(() => import('@/components/MapCharts'), { 
  ssr: false,
  loading: () => <div className="loading-container" style={{ height: '300px' }}><div className="spinner" /></div>
});

interface Stats {
  totalCount: number;
  byRegion: { region: string; count: number }[];
  byCollege: { college: string; count: number }[];
  byDegree: { degree: string; count: number }[];
  byGender: { gender: string; count: number }[];
  byCareerType: { career_type: string; count: number }[];
  byEnrollmentYear: { year: string; count: number }[];
  byHometown: { hometown: string; count: number }[];
  byGraduationYear: { year: string; count: number }[];
  byWechatGroup: { group: string; count: number }[];
}

const COLORS = ['#1a56db','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6','#f97316'];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number; name?: string;
}) => {
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null || percent == null) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0.04 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {name}
    </text>
  ) : null;
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!stats) return <div className="empty-state"><div className="empty-text">加载失败</div></div>;

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">数据统计</h1>
          <p className="page-subtitle">大工苏州校友通讯录多维数据总览</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value">{stats.totalCount.toLocaleString()}</div>
          <div className="stat-card-label">📋 校友总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.byWechatGroup.length}</div>
          <div className="stat-card-label">💬 微信社群数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{(stats.byGender.find(g => g.gender === '男')?.count || 0).toLocaleString()}</div>
          <div className="stat-card-label">👨 男性校友</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{(stats.byGender.find(g => g.gender === '女')?.count || 0).toLocaleString()}</div>
          <div className="stat-card-label">👩 女性校友</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.byRegion.length}</div>
          <div className="stat-card-label">📍 覆盖区域</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.byCollege.length}</div>
          <div className="stat-card-label">🎓 涉及学院</div>
        </div>
      </div>

      {/* Charts Row 1: Geography Maps */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">🏠 全国校友家乡分布</div>
          <MapChart 
            data={stats.byHometown.map(h => ({ name: h.hometown, value: h.count }))} 
            type="china" 
            title="全国分布" 
          />
        </div>

        <div className="chart-card">
          <div className="chart-title">📍 苏州地区校友分布</div>
          <MapChart 
            data={stats.byRegion
              .filter(r => ['吴中', '相城', '姑苏', '吴江', '虎丘', '工业园区', '高新区', '常熟', '张家港', '昆山', '太仓'].some(s => r.region.includes(s)))
              .map(r => ({ name: r.region, value: r.count }))
            } 
            type="suzhou" 
            title="苏州市区分布" 
          />
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">💬 各微信群人数对照</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.byWechatGroup.slice(0, 15)} layout="vertical" margin={{ left: 100, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="group" tick={{ fontSize: 11 }} width={100} />
              <Tooltip cursor={{ fill: 'var(--primary-light)' }} />
              <Bar dataKey="count" name="群成员数" radius={[0, 4, 4, 0]}>
                {stats.byWechatGroup.slice(0, 15).map((_, i) => (
                  <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <div className="chart-title">🎓 学院分布（Top 10）</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.byCollege.slice(0, 10)} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="college" tick={{ fontSize: 11 }} width={80} />
              <Tooltip cursor={{ fill: 'var(--primary-light)' }} />
              <Bar dataKey="count" name="人数" radius={[0, 4, 4, 0]}>
                {stats.byCollege.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Pies */}
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="chart-card">
          <div className="chart-title">👫 性别比例</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stats.byGender.filter(d => d.gender === '男' || d.gender === '女')}
                dataKey="count"
                nameKey="gender"
                cx="50%" cy="50%"
                outerRadius={90}
                labelLine={false}
                label={renderCustomLabel}
              >
                {stats.byGender.map((d, i) => (
                  <Cell key={i} fill={d.gender === '男' ? '#1a56db' : '#ec4899'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} 人`, n]} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">📚 最高学历分布</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stats.byDegree.filter(d => d.count > 5)}
                dataKey="count"
                nameKey="degree"
                cx="50%" cy="50%"
                outerRadius={90}
                labelLine={false}
                label={renderCustomLabel}
              >
                {stats.byDegree.filter(d => d.count > 5).map((_, i) => (
                  <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} 人`, n]} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">💼 事业类型分布</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stats.byCareerType}
                dataKey="count"
                nameKey="career_type"
                cx="50%" cy="50%"
                innerRadius={60}
                outerRadius={90}
              >
                {stats.byCareerType.map((_, i) => (
                  <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} 人`, n]} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year Trends */}
      <div className="charts-grid">
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div className="chart-title">📈 入学年份趋势</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.byEnrollmentYear} margin={{ left: 16, right: 32, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="入学人数" stroke="#1a56db" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div className="chart-title">🎓 毕业年份趋势</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.byGraduationYear.filter(d => Boolean(d.year) && d.year.length === 4)} margin={{ left: 16, right: 32, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="毕业人数" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
