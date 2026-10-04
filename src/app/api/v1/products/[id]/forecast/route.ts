import { NextRequest, NextResponse } from 'next/server';
import { forecastDemand } from '@/lib/forecast';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const horizonDays = parseInt(url.searchParams.get('horizon') || '7');
    
    const result = await forecastDemand(id, null, horizonDays);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
