import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '喜结连理 - 大工校友相亲联谊',
  description: '大工苏州校友真实实名交友与相亲平台，认证校友互助联谊，携手良缘。',
  openGraph: {
    title: '喜结连理 - 大工校友相亲联谊',
    description: '大工苏州校友真实实名交友与相亲平台，认证校友互助联谊，携手良缘。',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary',
    title: '喜结连理 - 大工校友相亲联谊',
    description: '大工苏州校友真实实名交友与相亲平台，认证校友互助联谊，携手良缘。',
    images: ['/logo.png'],
  },
};

export default function MatchmakingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* WeChat share card thumbnail helper */}
      <div style={{ display: 'none', fontSize: 0, lineHeight: 0, opacity: 0 }}>
        <img src="/logo.png" width="300" height="300" alt="喜结连理" />
      </div>
      {children}
    </>
  );
}
