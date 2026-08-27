'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; username?: string; real_name?: string; realName?: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      // Add a small delay to prevent fetching stale data right after an action
      setTimeout(() => {
        if (user?.role === 'ADMIN') fetchPendingCount();
        else if (user) fetchUserUnreadCount();
      }, 500);
    };
    window.addEventListener('pendingCountUpdate', handleUpdate);
    window.addEventListener('unreadCountUpdate', handleUpdate);
    return () => {
      window.removeEventListener('pendingCountUpdate', handleUpdate);
      window.removeEventListener('unreadCountUpdate', handleUpdate);
    };
  }, [user]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
          if (data.user.role === 'ADMIN') {
            fetchPendingCount();
          } else {
            fetchUserUnreadCount();
          }
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const fetchPendingCount = () => {
    fetch(`/api/admin/users/pending-count?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setPendingCount(data.count || 0))
      .catch(() => {});
  };

  function fetchUserUnreadCount() {
    fetch(`/api/notifications/unread-count?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setUserUnreadCount(data.count || 0))
      .catch(() => {});
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  interface NavItem {
    href: string;
    icon: string;
    label: string;
    badge?: number | null;
  }

  const navItems: NavItem[] = [
    { href: '/', icon: '👥', label: '通讯录' },
    { href: '/stats', icon: '📊', label: '数据统计' },
    { href: '/council', icon: '🏛️', label: '理事会成员' },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ 
      href: '/admin/permissions', 
      icon: '🔐', 
      label: '审核管理',
      badge: pendingCount > 0 ? pendingCount : null
    });
  }

  return (
    <>
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <div className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ padding: '0', background: 'none' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="sidebar-logo-title">大工苏州校友会</div>
        <div className="sidebar-logo-sub">通讯录管理系统</div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/' || pathname.startsWith('/alumni')
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-item-content">
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
              {'badge' in item && item.badge !== null && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-user-section">
        {user ? (
          <>
            <Link 
              href="/profile" 
              className={`sidebar-user-info-link ${pathname === '/profile' ? 'active' : ''}`}
            >
              <div className="sidebar-user-info">
                <div className="user-avatar" style={{ overflow: 'hidden', padding: '4px', background: 'white' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div className="user-meta">
                  <div className="user-display-name">
                    {user.role === 'ADMIN' ? '管理员' : (user.realName || user.real_name || user.username || '校友')}
                  </div>
                </div>
              </div>
              {userUnreadCount > 0 && (
                <span className="nav-badge">{userUnreadCount}</span>
              )}
            </Link>
            <button onClick={handleLogout} className="sidebar-logout-btn">
              <span className="nav-icon">🚪</span>
              退出登录
            </button>
          </>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
            未登录
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar-user-section {
          margin-top: auto;
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .sidebar-user-info-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          margin-bottom: 48px;
          border-radius: 8px;
          transition: all 0.2s;
          text-decoration: none;
        }
        .sidebar-user-info-link:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .sidebar-user-info-link.active {
          background: rgba(255, 255, 255, 0.1);
        }
        .sidebar-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .user-display-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
        }
        .user-role-badge {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sidebar-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #f87171;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sidebar-logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        .nav-item-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nav-badge {
          background: #ef4444;
          color: white;
          font-size: 11px;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
        }
        .sidebar-nav-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
    </aside>
    </>
  );
}
