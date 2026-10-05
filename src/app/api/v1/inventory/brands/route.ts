import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get('search') || '').toLowerCase().trim();

    // Query brands directly from Product table
    const rows: any = await db.$queryRawUnsafe(`
      SELECT 
        CASE 
          WHEN brand IS NULL OR trim(brand) = '' THEN 'Other / Unspecified' 
          ELSE trim(brand) 
        END as brandName,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT category) as rawCategories
      FROM Product
      GROUP BY brandName
      ORDER BY count DESC, brandName ASC
    `);

    let brands = rows.map((r: any) => {
      const name = String(r.brandName || 'Other / Unspecified');
      const count = Number(r.count || 0);
      const categories = r.rawCategories
        ? String(r.rawCategories).split(',').map((c: string) => c.trim()).filter(Boolean)
        : [];
      return {
        name,
        count,
        categories: categories.slice(0, 3),
        totalCategories: categories.length,
      };
    });

    if (search) {
      brands = brands.filter((b: any) =>
        b.name.toLowerCase().includes(search) ||
        b.categories.some((c: string) => c.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      totalBrands: brands.length,
      brands,
    });
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
