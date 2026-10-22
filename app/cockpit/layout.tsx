import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';
const shareImageUrl = `${BASE_URL}/share-cockpit.png?v=2026`;
const title = '数据驾驶舱 - 大工苏州校友会';
const description = '大连理工大学苏州校友数据驾驶舱，全景呈现校友分布、行业生态、相亲联谊与企业招聘实时洞察。';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    url: `${BASE_URL}/cockpit`,
    siteName: '大工人在苏州 · 数据驾驶舱',
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

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="image_src" href={shareImageUrl} />
      <meta itemProp="name" content={title} />
      <meta itemProp="description" content={description} />
      <meta itemProp="image" content={shareImageUrl} />

      {/* 微信卡片分享规范首图 (标准 display:none 容器，供微信爬虫蜘蛛精准提取) */}
      <div style={{ display: 'none' }}>
        <img
          src={shareImageUrl}
          width="300"
          height="300"
          alt={title}
        />
        <p>{description}</p>
      </div>

      {/* 微信卡片分享备用图 (超微尺寸，供部分微信 WebKit 内嵌转发提取) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', opacity: 0.001, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
        <img
          src={shareImageUrl}
          width="300"
          height="300"
          alt={title}
        />
      </div>

      {children}
    </>
  );
}
