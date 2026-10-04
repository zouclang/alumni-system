import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '数据统计 - 大工苏州校友通讯录',
  description: '大连理工大学苏州校友数据全景统计与分析',
  openGraph: {
    title: '数据统计 - 大工苏州校友通讯录',
    description: '大连理工大学苏州校友数据全景统计与分析',
    images: ['/logo.png'],
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
