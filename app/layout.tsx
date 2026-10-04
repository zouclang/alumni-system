import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: '大工苏州校友通讯录',
  description: '大连理工大学苏州校友通讯录管理系统',
  openGraph: {
    title: '大工苏州校友通讯录',
    description: '大连理工大学苏州校友通讯录管理系统',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary',
    title: '大工苏州校友通讯录',
    description: '大连理工大学苏州校友通讯录管理系统',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {/* WeChat share card thumbnail helper (first img in body) */}
        <div style={{ display: 'none', fontSize: 0, lineHeight: 0, opacity: 0 }}>
          <img src="/logo.png" width="300" height="300" alt="大工苏州校友会" />
        </div>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
