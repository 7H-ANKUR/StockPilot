import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  
  const recommendations = await db.recommendation.findMany({
    where: status ? { status } : {},
    include: {
      product: true,
      supplier: true,
      approvals: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  
  return NextResponse.json({
    count: recommendations.length,
    recommendations,
  });
}
