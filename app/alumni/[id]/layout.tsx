import type { Metadata } from 'next';
import { getDb } from '@/lib/db';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const alumniId = Number(id);
    if (!alumniId || isNaN(alumniId)) {
      return {
        title: '校友名片 | 大工苏州校友通讯录',
        description: '大连理工大学苏州校友通讯录管理系统',
      };
    }

    const db = getDb();
    const row = db.prepare('SELECT name, company, position, enrollment_year, college, is_company_public, is_position_public FROM alumni WHERE id = ?').get(alumniId) as any;
    if (!row) {
      return {
        title: '校友名片 | 大工苏州校友通讯录',
        description: '该校友信息不存在或已被移除',
      };
    }

    const title = `${row.name} 的校友名片 | 大工苏州校友通讯录`;
    const eduInfo = row.enrollment_year ? `${row.enrollment_year}级` : '';
    const collegeInfo = row.college ? ` · ${row.college}` : '';
    const workInfo = (row.is_company_public && row.company) ? ` · ${row.company}${row.position ? ` ${row.position}` : ''}` : '';
    const desc = `${row.name}（${eduInfo}${collegeInfo}）${workInfo}。点击查看校友名片与联络方式。`;

    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        images: ['/logo.png'],
      },
      twitter: {
        card: 'summary',
        title,
        description: desc,
        images: ['/logo.png'],
      },
    };
  } catch (e) {
    return {
      title: '校友名片 | 大工苏州校友通讯录',
      description: '大连理工大学苏州校友通讯录管理系统',
    };
  }
}

export default function AlumniDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
