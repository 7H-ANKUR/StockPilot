import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forecastDemand } from '@/lib/forecast';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, horizonDays = 7 } = body;
    
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }
    
    const result = await forecastDemand(productId, null, horizonDays);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
