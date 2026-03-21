'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CityPicker from '@/components/CityPicker';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // For 'new' registration
  const [alumniData, setAlumniData] = useState({
    gender: '',
    hometown: '',
    birth_month: '',
    region: '',
    college: '',
    major: '',
    degree: '',
    company: '',
    position: '',
    industry: '',
    career_type: '',
    business_desc: '',
    social_roles: '',
    interests: '',
    wechat_id: '',
  });
  
  const [experiences, setExperiences] = useState([
    { stage: '', start_year: '', end_year: '', college: '', major: '', sort_order: 0 }
  ]);

  const router = useRouter();

  const addExp = () => setExperiences([...experiences, { stage: '', start_year: '', end_year: '', college: '', major: '', sort_order: experiences.length }]);
  const removeExp = (i: number) => setExperiences(experiences.filter((_, idx) => idx !== i));
  const updateExp = (i: number, field: string, val: string) => {
    const next = [...experiences];
    next[i] = { ...next[i], [field]: val };
    setExperiences(next);
  };

  const handleCheckName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/register/check-name?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.matches && data.matches.length > 0) {
        setMatches(data.matches);
        setStep(2); // Show matches
      } else {
        setStep(3); // Go to full form
      }
    } catch (err) {
      setError('查询失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecord = (record: any) => {
    if (record.isLinked) {
      setError('该用户已注册，请使用注册用户名和密码登录');
      return;
    }
    setSelectedMatch(record);
    setStep(4); // Verify phone
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    setError('');

    const body = selectedMatch 
      ? { loginType: 'link', alumniId: selectedMatch.id, phone, password, wechat: alumniData.wechat_id }
      : { loginType: 'new', alumniData: { ...alumniData, name, experiences }, phone, password };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setStep(5); // Success
      } else {
        setError(data.error || '提交失败');
      }
    } catch (err) {
      setError('提交失败，请联系管理员');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className={`register-card ${step === 3 ? 'wide' : ''}`}>
        <div className="register-header">
          <img src="/logo.png" alt="Logo" className="register-logo" />
          <h1>校友注册</h1>
          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step-line ${step >= 4 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 4 ? 'active' : ''}`}>3</div>
          </div>
        </div>

        {error && <div className="register-error">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleCheckName} className="register-form">
            <p className="step-desc">请输入您的真实姓名，系统将自动核对现有档案</p>
            <div className="form-group">
              <label>真实姓名</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="例如：张三"
                required 
              />
            </div>
            <button type="submit" className="register-button" disabled={loading}>
              {loading ? '查询中...' : '下一步'}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="register-form">
            <p className="step-desc">系统中发现同名记录，请确认是否有您的信息：</p>
            <div className="match-list">
              {matches.map(m => (
                <div key={m.id} className={`match-item ${m.isLinked ? 'disabled' : ''}`} onClick={() => handleSelectRecord(m)}>
                  <div className="match-info">
                    <span className="match-name">{m.name}</span>
                    <span className="match-details">
                      {m.college} · {m.enrollment_year}级
                    </span>
                  </div>
                  <button className="match-select" disabled={m.isLinked}>
                    {m.isLinked ? '已注册' : '是我，点击选择'}
                  </button>
                </div>
              ))}
              <div className="match-item none" onClick={() => setStep(3)}>
                <div className="match-info">
                  <span className="match-name">以上都不是我</span>
                  <span className="match-details">我是新加入的校友</span>
                </div>
                <button className="match-select">继续注册</button>
              </div>
            </div>
            <button className="back-btn" onClick={() => setStep(1)}>返回修改姓名</button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="register-form wide">
            <p className="step-desc">未找到您的现有档案，请填写基本资料加入组织</p>
            
            <h3 className="section-title">安全与核心信息</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>电话</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div className="form-group">
                {/* Placeholder */}
              </div>
              <div className="form-group">
                <label>设置登录密码</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>确认密码</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '32px' }}>基本信息</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>性别</label>
                <select value={alumniData.gender} onChange={e => setAlumniData({...alumniData, gender: e.target.value})} required>
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <CityPicker value={alumniData.hometown} onChange={(v: string) => setAlumniData({...alumniData, hometown: v})} />
              <div className="form-group">
                <label>出生月份</label>
                <select value={alumniData.birth_month} onChange={e => setAlumniData({...alumniData, birth_month: e.target.value})}>
                  <option value="">请选择</option>
                  {Array.from({length: 12}, (_, i) => String(i+1)).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>所在区域 (苏州)</label>
                <select value={alumniData.region} onChange={e => setAlumniData({...alumniData, region: e.target.value})}>
                  <option value="">请选择</option>
                  {['工业园区','吴中区','姑苏区','高新区','相城区','吴江区','昆山','太仓','常熟','张家港'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>微信号</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={alumniData.wechat_id || ''} 
                    onChange={e => setAlumniData({...alumniData, wechat_id: e.target.value})} 
                    placeholder="微信号/手机号"
                  />
                  <span 
                    onClick={() => setAlumniData({...alumniData, wechat_id: phone})} 
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  >
                    同手机号
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>最高学历</label>
                <select value={alumniData.degree} onChange={e => setAlumniData({...alumniData, degree: e.target.value})}>
                  <option value="">请选择</option>
                  {['本科','硕士','博士','博士后'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '32px' }}>在校经历 (大工)</h3>
            <div className="exp-container">
              {experiences.map((exp, i) => (
                <div key={i} className="exp-item">
                  <div className="exp-grid">
                    <div className="form-group">
                      <label>阶段</label>
                      <select value={exp.stage} onChange={e => updateExp(i, 'stage', e.target.value)}>
                        <option value="">请选择</option>
                        <option value="本科">本科</option>
                        <option value="硕士">硕士</option>
                        <option value="博士">博士</option>
                        <option value="博士后">博士后</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>起始年份</label>
                      <input type="text" placeholder="如 2010" value={exp.start_year} onChange={e => updateExp(i, 'start_year', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>结束年份</label>
                      <input type="text" placeholder="如 2014" value={exp.end_year} onChange={e => updateExp(i, 'end_year', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>学院</label>
                      <input type="text" placeholder="所属学院" value={exp.college} onChange={e => updateExp(i, 'college', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>专业</label>
                      <input type="text" placeholder="所属专业" value={exp.major} onChange={e => updateExp(i, 'major', e.target.value)} />
                    </div>
                  </div>
                  {experiences.length > 1 && (
                    <button type="button" className="remove-exp" onClick={() => removeExp(i)}>移除此段经历</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-exp" onClick={addExp}>+ 添加在校经历阶段</button>
            </div>

            <h3 className="section-title" style={{ marginTop: '32px' }}>工作与社会活动</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>工作单位</label>
                <input type="text" value={alumniData.company} onChange={e => setAlumniData({...alumniData, company: e.target.value})} />
              </div>
              <div className="form-group">
                <label>职位</label>
                <input type="text" value={alumniData.position} onChange={e => setAlumniData({...alumniData, position: e.target.value})} />
              </div>
              <div className="form-group">
                <label>所属行业</label>
                <input type="text" value={alumniData.industry} onChange={e => setAlumniData({...alumniData, industry: e.target.value})} />
              </div>
              <div className="form-group">
                <label>事业类型</label>
                <select value={alumniData.career_type} onChange={e => setAlumniData({...alumniData, career_type: e.target.value})}>
                  <option value="">请选择</option>
                  {['职业经理（含高管、职员等）','自主创业（有公司）','其他（机关事业等）','退休','自由职业（无公司）'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group full">
                <label>社会职务</label>
                <textarea rows={2} value={alumniData.social_roles} onChange={e => setAlumniData({...alumniData, social_roles: e.target.value})} placeholder="例如：行业协会职务、政协委员等" />
              </div>
              <div className="form-group full">
                <label>个人或公司主要业务介绍</label>
                <textarea rows={3} value={alumniData.business_desc} onChange={e => setAlumniData({...alumniData, business_desc: e.target.value})} placeholder="请简述您的主要业务方向，方便校友对接合作" />
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '32px' }}>个人详情</h3>
            <div className="form-grid">
              <div className="form-group full">
                <label>兴趣爱好</label>
                <textarea rows={2} value={alumniData.interests} onChange={e => setAlumniData({...alumniData, interests: e.target.value})} placeholder="例如：网球、登山、创业等" />
              </div>
            </div>

            <div style={{ marginTop: '40px' }}>
              <button type="submit" className="register-button" disabled={loading}>
                {loading ? '正在提交...' : '确认提交审核'}
              </button>
              <button type="button" className="back-btn" onClick={() => setStep(1)} style={{ marginBottom: '20px' }}>返回修改姓名</button>
            </div>
          </form>
        )}

        {step === 4 && (
          <form onSubmit={handleFinalSubmit} className="register-form">
            <p className="step-desc">为了安全，请输入系统预留的手机号进行验证</p>
            <div className="form-group">
              <label>手机号</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="请输入您的手机号"
                required 
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                微信号
                <span 
                  onClick={() => setAlumniData({...alumniData, wechat_id: phone})} 
                  style={{ color: '#3b82f6', cursor: 'pointer', fontSize: '12px' }}
                >
                  同手机号
                </span>
              </label>
              <input 
                type="text" 
                value={alumniData.wechat_id} 
                onChange={e => setAlumniData({...alumniData, wechat_id: e.target.value})} 
                placeholder="微信号/手机号/QQ"
                required 
              />
            </div>
            <div className="form-group">
              <label>设置登录密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>确认密码</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="register-button" disabled={loading}>
              {loading ? '正在提交...' : '提交审核'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep(2)}>不，选错了</button>
          </form>
        )}

        {step === 5 && (
          <div className="register-success">
            <div className="success-icon">✅</div>
            <h2>提交成功</h2>
            <p>您的注册请求已提交至管理员审核。</p>
            <p>审核通过后，您即可使用真实姓名和密码登录系统。</p>
            <button className="register-button" onClick={() => router.push('/login')}>返回登录页</button>
          </div>
        )}

        <div className="register-footer">
          <p>© 2024 大工苏州校友会</p>
        </div>
      </div>

      <style jsx>{`
        .register-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f1112;
          padding: 20px;
        }
        .register-card {
          width: 100%;
          max-width: 500px;
          background: #1e2023;
          border-radius: 24px;
          padding: 40px;
          color: white;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .register-card.wide {
          max-width: 600px;
        }
        .register-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .register-logo { width: 50px; height: 50px; margin-bottom: 12px; }
        h1 { font-size: 22px; margin-bottom: 20px; }
        
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .step-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #334155;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }
        .step-line {
          width: 40px;
          height: 2px;
          background: #334155;
        }
        .step-dot.active, .step-line.active { background: #3b82f6; color: white; }
        
        .step-desc { color: #94a3b8; font-size: 14px; margin-bottom: 24px; text-align: center; }
        
        .form-group { margin-bottom: 20px; text-align: left; }
        label, :global(.form-label) { display: block; margin-bottom: 8px; font-size: 14px; color: #cbd5e1; }
        input, select, :global(.form-select), :global(.form-input) {
          width: 100%;
          padding: 12px;
          background: #0f1112;
          border: 1px solid #334155 !important;
          border-radius: 8px;
          color: white;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .register-button {
          width: 100%;
          padding: 14px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
        }
        
        .match-list { display: flex; flexDirection: column; gap: 12px; margin-bottom: 20px; }
        .match-item {
          background: #0f1112;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .match-item:hover:not(.disabled) { border-color: #3b82f6; background: #16181b; }
        .match-item.disabled { opacity: 0.5; cursor: not-allowed; }
        .match-name { display: block; font-weight: 600; }
        .match-details { font-size: 12px; color: #94a3b8; }
        .match-select {
          background: transparent;
          border: 1px solid #3b82f6;
          color: #3b82f6;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .match-item.none { border: 1px dashed #475569; }
        
        .back-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 14px;
          margin-top: 20px;
          cursor: pointer;
        }
        
        .form-group.full {
          grid-column: 1 / -1;
        }
        textarea {
          width: 100%;
          padding: 12px;
          background: #0f1112;
          border: 1px solid #334155;
          border-radius: 8px;
          color: white;
          resize: vertical;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #3b82f6;
          margin: 24px 0 16px;
          text-align: left;
          border-left: 4px solid #3b82f6;
          padding-left: 12px;
        }
        
        /* Experiences */
        .exp-container {
          background: rgba(255,255,255,0.03);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .exp-item {
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .exp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (min-width: 600px) {
          .exp-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        .remove-exp {
          background: none;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          margin-top: 10px;
          cursor: pointer;
        }
        .add-exp {
          background: rgba(59, 130, 246, 0.1);
          border: 1px dashed #3b82f6;
          color: #3b82f6;
          padding: 10px;
          width: 100%;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .register-error {
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .register-success { text-align: center; }
        .success-icon { font-size: 48px; margin-bottom: 16px; }
        
        .register-footer { margin-top: 30px; text-align: center; font-size: 12px; color: #475569; }
      `}</style>
    </div>
  );
}
