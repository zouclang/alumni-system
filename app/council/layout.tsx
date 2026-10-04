import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '理事会成员 - 大工苏州校友会',
  description: '大连理工大学苏州校友会理事会成员名录与组织架构',
  openGraph: {
    title: '理事会成员 - 大工苏州校友会',
    description: '大连理工大学苏州校友会理事会成员名录与组织架构',
    images: ['/logo.png'],
  },
};

export default function CouncilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
