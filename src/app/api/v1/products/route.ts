import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { brand: { contains: search } },
    ];
  }
  if (category) {
    where.category = category;
  }
  
  const withSalesFirst = url.searchParams.get('withSalesFirst') === 'true';

  let products: any[] = [];
  if (withSalesFirst) {
    const productsWithSales = await db.product.findMany({
      where: { ...where, sales: { some: {} } },
      take: limit,
      orderBy: { name: 'asc' },
    });
    const withSalesIds = new Set(productsWithSales.map(p => p.id));
    const remainingLimit = Math.max(0, limit - productsWithSales.length);

    let otherProducts: any[] = [];
    if (remainingLimit > 0) {
      otherProducts = await db.product.findMany({
        where: { ...where, id: { notIn: Array.from(withSalesIds) } },
        take: remainingLimit,
        orderBy: { name: 'asc' },
      });
    }

    products = [
      ...productsWithSales.map(p => ({ ...p, hasSales: true })),
      ...otherProducts.map(p => ({ ...p, hasSales: false })),
    ];
  } else {
    products = await db.product.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
  
  const categories = await db.product.findMany({
    select: { category: true },
    distinct: ['category'],
  });
  
  return NextResponse.json({
    count: products.length,
    categories: categories.map(c => c.category).filter(Boolean),
    products,
  });
}
