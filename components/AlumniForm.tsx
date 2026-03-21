'use client';

import { useState, useEffect } from 'react';
import CityPicker from './CityPicker';

interface AlumniFormProps {
  initial?: Record<string, string | number | null>;
  onClose?: () => void;
  onSaved: () => void;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
  inline?: boolean;
}

const REGIONS = ['工业园区','吴中区','姑苏区','高新区','相城区','吴江区','昆山','太仓','常熟','张家港'];
const DEGREES = ['本科','硕士','博士','博士后'];
const GENDERS = ['男','女','未知'];
const CAREER_TYPES = ['职业经理（含高管、职员等）','自主创业（有公司）','其他（机关事业等）','退休','自由职业（无公司）'];
const MONTHS = Array.from({length: 12}, (_, i) => String(i + 1));
const YES_NO = ['是','否'];
const ASSOCIATION_ROLES = ['理事长', '副理事长', '理事', '秘书长', '副秘书长'];

function Field({ label, name, value, onChange, required, type = 'text', span = false }: {
  label: string; name: string; value: string; onChange: (n: string, v: string) => void;
  required?: boolean; type?: string; span?: boolean;
}) {
  return (
    <div className={`form-group${span ? ' span-2' : ''}`}>
      <label className={`form-label${required ? ' required' : ''}`}>{label}</label>
      <input
        className="form-input"
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        required={required}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }: {
  label: string; name: string; value: string; onChange: (n: string, v: string) => void; options: string[];
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-select" name={name} value={value} onChange={(e) => onChange(name, e.target.value)}>
        <option value="">请选择</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function WechatGroupInput({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  useEffect(() => {
    if (!readOnly) {
      fetch('/api/stats').then(r => r.json()).then(d => {
        setSuggestions(d.byWechatGroup?.map((g: any) => g.group) || []);
      });
    }
  }, [readOnly]);

  const tags = value ? value.split(',').filter(Boolean) : [];

  const addTag = (t: string) => {
    if (readOnly) return;
    const n = t.trim();
    if (n && !tags.includes(n)) {
      onChange([...tags, n].join(','));
    }
    setInputVal('');
  };

  const removeTag = (t: string) => {
    if (readOnly) return;
    onChange(tags.filter(tg => tg !== t).join(','));
  };

  return (
    <div className="form-group span-2" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label">所在微信群 {readOnly ? '(管理员维护)' : '(支持多选和新增)'}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: readOnly ? '0' : '8px', minHeight: tags.length ? '28px' : '0' }}>
        {tags.map(t => (
          <span key={t} style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {t}
            {!readOnly && <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', lineHeight: 1 }} onClick={() => removeTag(t)}>×</span>}
          </span>
        ))}
        {tags.length === 0 && <span style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>暂无所属群</span>}
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            className="form-input" 
            style={{ flex: 1 }}
            value={inputVal} 
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(inputVal);
              }
            }}
            placeholder="输入群名并按回车添加..."
            list="group-suggestions"
          />
          <datalist id="group-suggestions">
            {suggestions.map(s => !tags.includes(s) && <option key={s} value={s} />)}
          </datalist>
          <button type="button" className="btn btn-primary" onClick={() => addTag(inputVal)}>添加</button>
        </div>
      )}
    </div>
  );
}

export default function AlumniForm({ initial, onClose, onSaved, onApprove, onReject, inline = false }: AlumniFormProps) {
  const isEdit = !!initial?.id;
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      });
  }, []);
  
  // Track scalar fields
    const [form, setForm] = useState({
    name: String(initial?.name || ''),
    has_duplicate_name: String(initial?.has_duplicate_name || ''),
    gender: String(initial?.gender || ''),
    hometown: String(initial?.hometown || ''),
    enrollment_year: String(initial?.enrollment_year || ''),
    graduation_year: String(initial?.graduation_year || ''),
    college: String(initial?.college || ''),
    college_normalized: String(initial?.college_normalized || ''),
    major: String(initial?.major || ''),
    degree: String(initial?.degree || ''),
    phone: String(initial?.phone || ''),
    qq: String(initial?.qq || ''),
    wechat_id: String(initial?.wechat_id || ''),
    interests: String(initial?.interests || ''),
    dut_verified: String(initial?.dut_verified || ''),
    birth_month: String(initial?.birth_month || ''),
    region: String(initial?.region || ''),
    career_type: String(initial?.career_type || ''),
    company: String(initial?.company || ''),
    position: String(initial?.position || ''),
    industry: String(initial?.industry || ''),
    social_roles: String(initial?.social_roles || ''),
    school_experience: String(initial?.school_experience || ''),
    business_desc: String(initial?.business_desc || ''),
    wechat_groups: String(initial?.wechat_groups || ''),
    association_role: String(initial?.association_role || ''),
  });

  // Track dynamic experiences
  const [experiences, setExperiences] = useState<any[]>(() => {
    const existing = Array.isArray((initial as any)?.experiences) ? (initial as any).experiences : [];
    if (existing.length === 0) {
      return [{ stage: '', start_year: '', end_year: '', college: '', major: '', sort_order: 0 }];
    }
    return existing;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Name duplication check state
  const [duplicateCheckQuery, setDuplicateCheckQuery] = useState('');
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [checkingName, setCheckingName] = useState(false);

  useEffect(() => {
    if (!form.name || form.name.trim().length < 2 || isEdit) {
      setDuplicateMatches([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setCheckingName(true);
      fetch(`/api/alumni?search=${encodeURIComponent(form.name.trim())}&pageSize=5`)
        .then(res => res.json())
        .then(data => {
          setDuplicateMatches(data.data || []);
        })
        .finally(() => setCheckingName(false));
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [form.name, isEdit]);

  const set = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }));

  const updateExp = (index: number, field: string, value: string) => {
    const newExps = [...experiences];
    newExps[index] = { ...newExps[index], [field]: value };
    setExperiences(newExps);
  };

  const removeExp = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const addExp = () => {
    setExperiences([...experiences, { stage: '', start_year: '', end_year: '', college: '', major: '', sort_order: experiences.length }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('姓名不能为空'); return; }
    setSaving(true);
    setError('');
    
    // Sort experiences before saving just in case
    const payloadExperiences = experiences.map((exp, i) => ({ ...exp, sort_order: i }));
    const payload = { ...form, experiences: payloadExperiences };

    try {
      const url = isEdit ? `/api/alumni/${initial!.id}` : '/api/alumni';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      if (onApprove) {
        await onApprove();
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit}>
      <div className={inline ? 'inline-form-body' : 'modal-body'}>
        {error && <div style={{ color: 'var(--red)', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}
        
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>基本信息</h3>
        
        {/* Duplicate Match Warning */}
        {duplicateMatches.length > 0 && !isEdit && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 500, marginBottom: '8px' }}>⚠️ 发现系统中已存在同名校友，您可以选择直接编辑已有记录：</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {duplicateMatches.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '13px', color: '#b45309' }}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span> 
                    {m.college && ` · ${m.college}`}
                    {m.enrollment_year && ` · ${m.enrollment_year}级`}
                    {m.experiences && m.experiences.length > 0 ? (
                      <div style={{ marginTop: '4px', color: '#92400e', fontSize: '12px', opacity: 0.8 }}>
                        在校: {m.experiences.map((e: any) => `${e.stage || ''}${e.college || ''}`).join(' / ')}
                      </div>
                    ) : m.school_experience ? (
                      <div style={{ marginTop: '4px', color: '#92400e', fontSize: '12px', opacity: 0.8 }}>
                        在校: {m.school_experience}
                      </div>
                    ) : null}
                  </div>
                  <a href={`/alumni/${m.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ borderColor: '#fcd34d', color: '#b45309' }}>去编辑该校友</a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label required" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              姓名
              {checkingName && <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'normal' }}>正在检查重名...</span>}
            </label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>
          <SelectField label="性别" name="gender" value={form.gender} onChange={set} options={GENDERS} />
          <CityPicker value={form.hometown} onChange={(v: string) => set('hometown', v)} />
          <SelectField label="生日月份" name="birth_month" value={form.birth_month} onChange={set} options={MONTHS} />
          <SelectField label="所在区域" name="region" value={form.region} onChange={set} options={REGIONS} />
          <Field label="联系电话" name="phone" value={form.phone} onChange={set} type="tel" />
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              微信号
              <button 
                type="button" 
                onClick={() => set('wechat_id', form.phone)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', padding: 0, fontWeight: 500 }}
              >
                同手机号
              </button>
            </label>
            <input
              className="form-input"
              value={form.wechat_id || ''}
              onChange={(e) => set('wechat_id', e.target.value)}
            />
          </div>
          {currentUser?.role === 'ADMIN' && (
            <SelectField label="大工人认证" name="dut_verified" value={form.dut_verified} onChange={set} options={YES_NO} />
          )}
          <div className="form-group">
            <label className="form-label">
              最高学历
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal', display: 'block', marginTop: '2px' }}>(不限于大工，可填外校获取的更高学历)</span>
            </label>
            <select className="form-select" name="degree" value={form.degree} onChange={(e) => set('degree', e.target.value)}>
              <option value="">请选择</option>
              {DEGREES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {currentUser?.role === 'ADMIN' && (
             <WechatGroupInput value={form.wechat_groups} onChange={(v) => set('wechat_groups', v)} />
          )}
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: 600, marginTop: '24px', marginBottom: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>在校经历</h3>
        
        {/* Dynamic Experiences */}
        <div style={{ marginBottom: '16px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button type="button" onClick={addExp} className="btn btn-outline btn-sm">➕ 添加阶段</button>
          </div>
          
          {experiences.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>无特殊分段经历</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {experiences.map((exp, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2fr 2fr auto', gap: '8px', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">阶段</label>
                    <select className="form-select" value={exp.stage} onChange={(e) => updateExp(i, 'stage', e.target.value)}>
                      <option value="">请选择</option>
                      <option value="本科">本科</option>
                      <option value="硕士">硕士</option>
                      <option value="博士">博士</option>
                      <option value="博士后">博士后</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">起始年</label>
                    <input className="form-input" value={exp.start_year || ''} onChange={(e) => updateExp(i, 'start_year', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">结束年</label>
                    <input className="form-input" value={exp.end_year || ''} onChange={(e) => updateExp(i, 'end_year', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">学院</label>
                    <input className="form-input" value={exp.college || ''} onChange={(e) => updateExp(i, 'college', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">专业</label>
                    <input className="form-input" value={exp.major || ''} onChange={(e) => updateExp(i, 'major', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeExp(i)} className="btn btn-danger" style={{ padding: '8px' }}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>


        <h3 style={{ fontSize: '15px', fontWeight: 600, marginTop: '24px', marginBottom: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>工作与社会活动</h3>
        <div className="form-grid">
          <Field label="工作单位" name="company" value={form.company} onChange={set} />
          <Field label="职位" name="position" value={form.position} onChange={set} />
          <SelectField label="事业类型" name="career_type" value={form.career_type} onChange={set} options={CAREER_TYPES} />
          <Field label="所属行业" name="industry" value={form.industry} onChange={set} />
          <div className="form-group span-2">
            <label className="form-label">个人或公司主要业务介绍</label>
            <textarea className="form-textarea" rows={3} value={form.business_desc} onChange={(e) => set('business_desc', e.target.value)} />
          </div>
          <div className="form-group span-2">
            <label className="form-label">社会职务</label>
            <textarea className="form-textarea" rows={2} value={form.social_roles} onChange={(e) => set('social_roles', e.target.value)} />
          </div>
          <div className="form-group span-2">
            <label className="form-label">兴趣爱好</label>
            <textarea className="form-textarea" rows={2} value={form.interests} onChange={(e) => set('interests', e.target.value)} />
          </div>

          {isEdit && currentUser?.role === 'ADMIN' && (
            <div style={{ gridColumn: '1 / -1', marginTop: '16px', borderTop: '1px dashed #e5e7eb', paddingTop: '16px' }}>
                <div className="detail-item span-2 registration-status-box" style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: '16px' }}>
                  <div className="detail-label" style={{ color: '#60a5fa', marginBottom: '12px', fontWeight: 700 }}>帐号注册状态</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {(initial as any)?.registration?.isRegistered ? (
                      <div className="status-label approved">✅ 已注册用户 (角色: {(initial as any)?.registration?.role || (initial as any)?.role || 'USER'})</div>
                    ) : (
                      <div className="status-label pending" style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'none' }}>未注册登录帐号</div>
                    )}

                    {(initial as any)?.registration?.isRegistered && currentUser?.role === 'ADMIN' && (
                      <button 
                        type="button"
                        className="btn btn-outline btn-sm delete-user-btn"
                        style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                        onClick={async () => {
                          if (confirm('确定要删除该用户的登录账号吗？这将移除其登录权限，但保留此校友档案资料。')) {
                            setSaving(true);
                            try {
                              const targetId = (initial as any)?.registration?.userId || (initial as any)?.userId;
                              if (!targetId) {
                                alert('错误：未找到相关的用户 ID');
                                return;
                              }
                              const res = await fetch(`/api/admin/users/${targetId}`, { method: 'DELETE' });
                              if (res.ok) {
                                alert('账号已删除');
                                onSaved();
                              } else {
                                alert('删除失败: ' + await res.text());
                              }
                            } catch (e) {
                              alert('连接失败');
                            }
                            setSaving(false);
                          }
                        }}
                      >
                        🗑️ 删除注册账号
                      </button>
                    )}
                  </div>
                </div>

              <label className="form-label" style={{ color: '#0369a1', fontWeight: 600 }}>校友会职务 (仅管理员可见)</label>
              <select 
                className="form-select" 
                value={form.association_role} 
                onChange={(e) => set('association_role', e.target.value)}
                style={{ borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
              >
                <option value="">普通校友</option>
                {ASSOCIATION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
        </div>

      </div>
      <div className={inline ? 'inline-form-footer' : 'modal-footer'}>
        {onClose && <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>}
        {onReject && (initial as any)?.status === 'PENDING' && (
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={async () => {
              if (confirm('确定要拒绝该申请吗？')) {
                setSaving(true);
                await onReject();
                setSaving(false);
                if (onClose) onClose();
              }
            }}
            disabled={saving}
          >
            拒绝申请
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving} style={inline ? { padding: '12px 30px' } : {}}>
          {saving ? '保存中...' : (onApprove && (initial as any)?.status === 'PENDING' ? '保存并批准' : (isEdit ? '保存修改' : '添加校友'))}
        </button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="alumni-form-inline">
        {formContent}
        <style jsx>{`
          .inline-form-body {
            padding: 0;
            margin-bottom: 24px;
          }
          .inline-form-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✏️ 编辑校友' : '➕ 新增校友'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
