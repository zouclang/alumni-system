import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';
const shareImageUrl = `${BASE_URL}/share-matchmaking.png?v=2026`;
const title = '喜结连理 - 大工校友相亲联谊';
const description = '大工苏州校友真实实名交友与相亲平台，认证校友互助联谊，携手良缘。';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    url: `${BASE_URL}/matchmaking`,
    siteName: '大工人在苏州 · 喜结连理',
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

export default function MatchmakingLayout({ children }: { children: React.ReactNode }) {
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
