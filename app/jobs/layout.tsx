import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';
const shareImageUrl = `${BASE_URL}/share-jobs.png?v=2026`;
const title = '连理招聘 - 大工校友企业招聘市场';
const description = '大连理工大学苏州校友企业招聘与求职对接平台，汇集全职、兼职、实习与合伙人机会，校友直聘、靠谱内推。';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    url: `${BASE_URL}/jobs`,
    siteName: '大工人在苏州 · 连理招聘',
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

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="image_src" href={shareImageUrl} />
      <meta itemProp="name" content={title} />
      <meta itemProp="description" content={description} />
      <meta itemProp="image" content={shareImageUrl} />

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

      {children}
    </>
  );
}
