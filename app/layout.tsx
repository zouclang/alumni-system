import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://godii.top';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: '大工苏州校友通讯录',
  description: '大连理工大学苏州校友通讯录管理系统',
  openGraph: {
    title: '大工苏州校友通讯录',
    description: '大连理工大学苏州校友通讯录管理系统',
    url: BASE_URL,
    siteName: '大工人在苏州',
    images: [
      {
        url: `${BASE_URL}/share-alumni.png`,
        width: 600,
        height: 600,
        alt: '大工苏州校友会',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '大工苏州校友通讯录',
    description: '大连理工大学苏州校友通讯录管理系统',
    images: [`${BASE_URL}/share-alumni.png`],
  },
  other: {
    'itemprop:image': `${BASE_URL}/share-alumni.png`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="image_src" href={`${BASE_URL}/share-alumni.png`} />
      </head>
      <body>
        {/* WeChat share card thumbnail helper (positioned off-screen, not display:none) */}
        <div style={{ position: 'absolute', top: -9999, left: -9999, width: 0, height: 0, overflow: 'hidden' }}>
          <img src={`${BASE_URL}/share-alumni.png`} width="300" height="300" alt="大工苏州校友会" />
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
