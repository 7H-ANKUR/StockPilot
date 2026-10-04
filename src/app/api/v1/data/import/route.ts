import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap, ingestSupermartCSV, ingestBigBasketCSV, ingestSuperstoreXLSX, seedSuppliersAndInventory } from '@/lib/ingestion';

const SUPERMART_PATH = '/home/z/my-project/upload/extracted_1/Supermart Grocery Sales - Retail Analytics Dataset.csv';
const BIGBASKET_PATH = '/home/z/my-project/upload/extracted_2/BigBasket Products.csv';
const SUPERSTORE_PATH = '/home/z/my-project/upload/superstore-sales-analysis.xlsx';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source || 'ALL';
    
    await ensureBootstrap();
    
    const results: any[] = [];
    
    if (source === 'ALL' || source === 'SUPERMART') {
      try {
        const fs = await import('fs');
        if (fs.existsSync(SUPERMART_PATH)) {
          results.push(await ingestSupermartCSV(SUPERMART_PATH));
        }
      } catch (e: any) {
        results.push({ source: 'SUPERMART', error: e.message });
      }
    }
    
    if (source === 'ALL' || source === 'BIGBASKET') {
      try {
        const fs = await import('fs');
        if (fs.existsSync(BIGBASKET_PATH)) {
          results.push(await ingestBigBasketCSV(BIGBASKET_PATH));
        }
      } catch (e: any) {
        results.push({ source: 'BIGBASKET', error: e.message });
      }
    }
    
    if (source === 'ALL' || source === 'SUPERSTORE') {
      try {
        const fs = await import('fs');
        if (fs.existsSync(SUPERSTORE_PATH)) {
          results.push(await ingestSuperstoreXLSX(SUPERSTORE_PATH));
        }
      } catch (e: any) {
        results.push({ source: 'SUPERSTORE', error: e.message });
      }
    }
    
    if (source === 'ALL' || source === 'SEED_SUPPLIERS') {
      try {
        results.push({ source: 'SEED_SUPPLIERS', ...(await seedSuppliersAndInventory()) });
      } catch (e: any) {
        results.push({ source: 'SEED_SUPPLIERS', error: e.message });
      }
    }
    
    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  const sources = await db.dataSource.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ sources });
}
