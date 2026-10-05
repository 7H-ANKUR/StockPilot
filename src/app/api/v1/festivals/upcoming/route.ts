import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const today = new Date();
  const next90 = new Date();
  next90.setDate(next90.getDate() + 90);
  
  const festivals = await db.festival.findMany({
    where: {
      endDate: { gte: today },
      startDate: { lte: next90 },
    },
    orderBy: { startDate: 'asc' },
  });
  
  return NextResponse.json({ festivals });
}
