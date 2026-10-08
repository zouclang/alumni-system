import type { Metadata } from 'next';
import { getDb } from '@/lib/db';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://godii.top';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const jobId = Number(id);
    if (!jobId || isNaN(jobId)) {
      return {
        title: '连理招聘 · 大工苏州校友企业招聘',
        description: '大连理工大学苏州校友企业招聘与求职平台',
      };
    }

    const db = getDb();
    const job = db.prepare(`
      SELECT jp.*, a.name as publisher_name 
      FROM job_postings jp
      LEFT JOIN alumni a ON jp.publisher_alumni_id = a.id
      WHERE jp.id = ?
    `).get(jobId) as any;

    if (!job) {
      return {
        title: '岗位信息 | 连理招聘 · 大工苏州校友会',
        description: '该招聘岗位不存在或已下架',
      };
    }

    const title = `【招聘】${job.job_title} · ${job.company_name} | 连理招聘`;
    const publisherText = job.publisher_name ? `由校友 ${job.publisher_name} 发布` : '校友企业直聘';
    const desc = `${job.company_name} 诚聘 ${job.job_title}（${job.salary_range}，${job.location}）。${publisherText}，点击查看岗位职责与要求，支持在线投递简历。`;
    const shareImageUrl = `${BASE_URL}/share-jobs.png`;

    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        type: 'article',
        url: `${BASE_URL}/jobs/${jobId}`,
        siteName: '大工人在苏州 · 连理招聘',
        images: [
          {
            url: shareImageUrl,
            width: 600,
            height: 600,
            alt: '连理招聘',
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
      title: '连理招聘 · 大工苏州校友企业招聘',
      description: '大连理工大学苏州校友企业招聘与求职对接平台',
    };
  }
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  const shareImageUrl = `${BASE_URL}/share-jobs.png`;
  return (
    <>
      {/* WeChat share card thumbnail helper */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, width: 0, height: 0, overflow: 'hidden' }}>
        <img src={shareImageUrl} width="300" height="300" alt="连理招聘" />
      </div>
      {children}
    </>
  );
}
