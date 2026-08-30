'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user?.role === 'ADMIN') {
          router.replace('/admin/permissions');
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/admin/permissions');
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

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0b0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        验证身份中...
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-bg-overlay"></div>

      <div className="login-card">
        <div className="login-header">
          <img src="/logo.png" alt="Logo" className="login-logo" />
          <h1>大工苏州校友会</h1>
          <p>管理后台系统</p>
        </div>

        <div className="login-title">
          <h2>🛡️ 管理员登录</h2>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>管理员用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入管理员账号"
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理员密码"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '登录中...' : '管理员登录'}
          </button>

          <div className="login-footer">
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
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
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
          margin-bottom: 24px;
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

        .login-title {
          text-align: center;
          margin-bottom: 24px;
        }

        .login-title h2 {
          font-size: 18px;
          color: #60a5fa;
          font-weight: 700;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin: 0;
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
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(0, 0, 0, 0.35);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
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
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
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

        .copyright {
          font-size: 12px;
          margin-top: 16px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
