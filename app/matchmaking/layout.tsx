import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';
const shareImageUrl = `${BASE_URL}/share-matchmaking.png`;

export const metadata: Metadata = {
  title: '喜结连理 - 大工校友相亲联谊',
  description: '大工苏州校友真实实名交友与相亲平台，认证校友互助联谊，携手良缘。',
  openGraph: {
    title: '喜结连理 - 大工校友相亲联谊',
    description: '大工苏州校友真实实名交友与相亲平台，认证校友互助联谊，携手良缘。',
    url: `${BASE_URL}/matchmaking`,
    siteName: '大工人在苏州 · 喜结连理',
    images: [
      {
        url: shareImageUrl,
        width: 600,
        height: 600,
        alt: '喜结连理',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '喜结连理 - 大工校友相亲联谊',
    description: '大工苏州校友真实实名交友与相亲平台，认证校友互助联谊，携手良缘。',
    images: [shareImageUrl],
  },
  other: {
    'itemprop:image': shareImageUrl,
  },
};

export default function MatchmakingLayout({ children }: { children: React.ReactNode }) {
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
          alt="喜结连理"
        />
      </div>
      {children}
    </>
  );
}
