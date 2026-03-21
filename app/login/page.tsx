'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'admin' | 'alumni'>('admin');
  const [username, setUsername] = useState('');
  const [realName, setRealName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          loginType === 'admin' 
            ? { username, password } 
            : { realName, password }
        ),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('连接服务器失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg-overlay"></div>
      
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.png" alt="Logo" className="login-logo" />
          <h1>大工苏州校友会</h1>
          <p>校友通讯录管理系统</p>
        </div>

        <div className="login-tabs">
          <button 
            className={`login-tab ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => { setLoginType('admin'); setError(''); }}
          >
            管理员登录
          </button>
          <button 
            className={`login-tab ${loginType === 'alumni' ? 'active' : ''}`}
            onClick={() => { setLoginType('alumni'); setError(''); }}
          >
            校友登录
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {loginType === 'admin' ? (
            <div className="form-group">
              <label>用户名</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="请输入管理员用户名"
                required 
              />
            </div>
          ) : (
            <div className="form-group">
              <label>真实姓名</label>
              <input 
                type="text" 
                value={realName} 
                onChange={(e) => setRealName(e.target.value)} 
                placeholder="请输入您的真实姓名"
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label>密码</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="请输入密码"
              required 
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '登录中...' : '立即登录'}
          </button>

          <div className="login-footer">
            {loginType === 'alumni' && (
              <p>还没有账号？ <a href="/register">立即注册</a></p>
            )}
            <p className="copyright">© 2024 大工苏州校友会 多多技术支持</p>
          </div>
        </form>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0b0d;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .login-bg-overlay {
          position: absolute;
          inset: 0;
          background-image: url('/login-bg.png');
          background-size: cover;
          background-position: center;
          filter: blur(4px) brightness(0.95);
          transform: scale(1.05);
          z-index: 1;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          padding: 48px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 10;
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
        }

        h1 {
          font-size: 24px;
          color: white;
          margin-bottom: 8px;
          font-weight: 700;
        }

        p {
          color: #94a3b8;
          font-size: 14px;
        }

        .login-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 32px;
        }

        .login-tab {
          flex: 1;
          padding: 10px;
          border: none;
          background: none;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .login-tab.active {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .login-form .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          color: #e2e8f0;
          font-size: 14px;
          margin-bottom: 8px;
          font-weight: 500;
        }

        input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .login-error {
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: center;
        }

        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 24px;
          text-align: center;
        }

        .login-footer p {
          margin-bottom: 8px;
        }

        .login-footer a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
        }

        .login-footer a:hover {
          text-decoration: underline;
        }

        .copyright {
          font-size: 12px;
          margin-top: 16px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
