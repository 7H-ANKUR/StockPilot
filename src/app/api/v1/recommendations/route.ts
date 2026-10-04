import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  
  const recommendations = await db.recommendation.findMany({
    where: status && status !== 'all' ? { status } : {},
    include: {
      product: true,
      supplier: true,
      approvals: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Calculate global breakdown across all recommendations
  const allCounts = await db.recommendation.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const statsMap: Record<string, number> = {};
  for (const c of allCounts) {
    statsMap[c.status] = c._count.id;
  }

  const stats = {
    pending: statsMap['PENDING_REVIEW'] || 0,
    approved: (statsMap['APPROVED'] || 0) + (statsMap['MODIFIED'] || 0),
    rejected: statsMap['REJECTED'] || 0,
    poGenerated: statsMap['PO_GENERATED'] || 0,
    total: Object.values(statsMap).reduce((a, b) => a + b, 0),
  };
  
  return NextResponse.json({
    count: recommendations.length,
    recommendations,
    stats,
  });
}
