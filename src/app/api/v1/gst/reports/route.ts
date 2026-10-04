import { NextRequest, NextResponse } from 'next/server';
import { getGstReport } from '@/lib/workflow';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const report = await getGstReport(start, end);
  return NextResponse.json(report);
}
