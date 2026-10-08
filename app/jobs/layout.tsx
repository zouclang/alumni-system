import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';
const shareImageUrl = `${BASE_URL}/share-jobs.png`;

export const metadata: Metadata = {
  title: '连理招聘 - 大工校友企业招聘市场',
  description: '大连理工大学苏州校友企业招聘与求职对接平台，汇集全职、兼职、实习与合伙人机会，校友直聘、靠谱内推。',
  openGraph: {
    title: '连理招聘 - 大工校友企业招聘市场',
    description: '大连理工大学苏州校友企业招聘与求职对接平台，汇集全职、兼职、实习与合伙人机会，校友直聘、靠谱内推。',
    url: `${BASE_URL}/jobs`,
    siteName: '大工人在苏州 · 连理招聘',
    images: [
      {
        url: shareImageUrl,
        width: 600,
        height: 600,
        alt: '连理招聘',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '连理招聘 - 大工校友企业招聘市场',
    description: '大连理工大学苏州校友企业招聘与求职对接平台',
    images: [shareImageUrl],
  },
  other: {
    'itemprop:image': shareImageUrl,
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="image_src" href={shareImageUrl} />
        <meta itemProp="image" content={shareImageUrl} />
      </head>
      {/* WeChat share card thumbnail helper */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, zIndex: -9999, pointerEvents: 'none' }}>
        <img
          src={shareImageUrl}
          width="300"
          height="300"
          style={{ width: '300px', height: '300px', display: 'block' }}
          alt="连理招聘"
        />
      </div>
      {children}
    </>
  );
}
