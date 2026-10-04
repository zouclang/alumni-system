import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '连理招聘 - 大工校友企业招聘市场',
  description: '大连理工大学苏州校友企业招聘与求职对接平台，汇集全职、兼职、实习与合伙人机会，校友直聘、靠谱内推。',
  openGraph: {
    title: '连理招聘 - 大工校友企业招聘市场',
    description: '大连理工大学苏州校友企业招聘与求职对接平台，汇集全职、兼职、实习与合伙人机会，校友直聘、靠谱内推。',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary',
    title: '连理招聘 - 大工校友企业招聘市场',
    description: '大连理工大学苏州校友企业招聘与求职对接平台',
    images: ['/logo.png'],
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* WeChat share card thumbnail helper */}
      <div style={{ display: 'none', fontSize: 0, lineHeight: 0, opacity: 0 }}>
        <img src="/logo.png" width="300" height="300" alt="连理招聘" />
      </div>
      {children}
    </>
  );
}
