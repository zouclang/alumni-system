import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';
const shareImageUrl = `${BASE_URL}/share-alumni.png?v=2026`;
const title = '大工苏州校友通讯录';
const description = '大连理工大学苏州校友通讯录管理系统';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    url: BASE_URL,
    siteName: '大工人在苏州',
    images: [
      {
        url: shareImageUrl,
        width: 600,
        height: 600,
        alt: title,
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: [shareImageUrl],
  },
  other: {
    'itemprop:name': title,
    'itemprop:description': description,
    'itemprop:image': shareImageUrl,
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
        <link rel="image_src" href={shareImageUrl} />
        <meta itemProp="name" content={title} />
        <meta itemProp="description" content={description} />
        <meta itemProp="image" content={shareImageUrl} />
      </head>
      <body>
        {/* 微信卡片分享规范首图 (标准 display:none 容器) */}
        <div style={{ display: 'none' }}>
          <img
            src={shareImageUrl}
            width="300"
            height="300"
            alt={title}
          />
          <p>{description}</p>
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
