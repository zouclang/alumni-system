import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';

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
      <body>
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
