import type { Metadata } from 'next';
import { getDb } from '@/lib/db';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://godii.top:8085';

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
    const shareImageUrl = `${BASE_URL}/share-alumni.png`;

    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        url: `${BASE_URL}/alumni/${alumniId}`,
        siteName: '大工人在苏州 · 校友通讯录',
        images: [
          {
            url: shareImageUrl,
            width: 600,
            height: 600,
            alt: '大工苏州校友通讯录',
          },
        ],
      },
      twitter: {
        card: 'summary',
        title,
        description: desc,
        images: [shareImageUrl],
      },
      other: {
        'itemprop:image': shareImageUrl,
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
  const shareImageUrl = `${BASE_URL}/share-alumni.png`;
  return (
    <>
      <div style={{ position: 'absolute', top: -9999, left: -9999, width: 0, height: 0, overflow: 'hidden' }}>
        <img src={shareImageUrl} width="300" height="300" alt="校友名片" />
      </div>
      {children}
    </>
  );
}
