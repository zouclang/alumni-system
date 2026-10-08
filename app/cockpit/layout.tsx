import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';
const shareImageUrl = `${BASE_URL}/share-cockpit.png`;

export const metadata: Metadata = {
  title: '数据驾驶舱 - 大工苏州校友会',
  description: '大连理工大学苏州校友数据驾驶舱，全景呈现校友分布、行业生态、相亲联谊与企业招聘实时洞察。',
  openGraph: {
    title: '数据驾驶舱 - 大工苏州校友会',
    description: '大连理工大学苏州校友数据驾驶舱，全景呈现校友分布、行业生态、相亲联谊与企业招聘实时洞察。',
    url: `${BASE_URL}/cockpit`,
    siteName: '大工人在苏州 · 数据驾驶舱',
    images: [
      {
        url: shareImageUrl,
        width: 600,
        height: 600,
        alt: '数据驾驶舱',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '数据驾驶舱 - 大工苏州校友会',
    description: '大连理工大学苏州校友数据驾驶舱',
    images: [shareImageUrl],
  },
  other: {
    'itemprop:image': shareImageUrl,
  },
};

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="image_src" href={shareImageUrl} />
        <meta itemProp="image" content={shareImageUrl} />
      </head>
      {/* WeChat share card thumbnail helper with explicit 300x300 dimensions for WeChat spider */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, zIndex: -9999, pointerEvents: 'none' }}>
        <img
          src={shareImageUrl}
          width="300"
          height="300"
          style={{ width: '300px', height: '300px', display: 'block' }}
          alt="数据驾驶舱"
        />
      </div>
      {children}
    </>
  );
}
