import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestedFestival = url.searchParams.get('festivalName');

    const today = new Date();
    // Use Asia/Kolkata timezone reference for current India date
    const todayIndiaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    const todayIndia = new Date(todayIndiaStr + 'T00:00:00.000Z');

    let festival: any = null;

    if (requestedFestival) {
      festival = await db.festival.findFirst({
        where: { name: requestedFestival },
      });
    }

    if (!festival) {
      // Automatically detect the most relevant upcoming festival (startDate >= todayIndia)
      festival = await db.festival.findFirst({
        where: {
          startDate: { gte: todayIndia },
        },
        orderBy: { startDate: 'asc' },
      });
    }

    // Fallback if no future festival found, get the latest festival
    if (!festival) {
      festival = await db.festival.findFirst({
        orderBy: { startDate: 'desc' },
      });
    }

    if (!festival) {
      return NextResponse.json({
        error: 'No festival data found in calendar.',
      }, { status: 404 });
    }

    // Days remaining calculation
    const festivalStartDate = new Date(festival.startDate);
    const diffTime = festivalStartDate.getTime() - todayIndia.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Determine category mappings for the festival
    const categoryConfigs = getFestivalCategoryConfigs(festival.name, festival.categories);

    // Fetch products and compute metrics for each category candidate
    const categoryAlerts: any[] = [];

    for (const config of categoryConfigs) {
      const { categoryName, expectedImpact, keywords } = config;

      // Find products matching keywords or category name
      const allProducts = await db.product.findMany({
        select: { id: true, name: true, category: true, subcategory: true, sellingPrice: true },
      });

      const matchingProducts = allProducts.filter(p => {
        const fullText = `${p.name} ${p.category || ''} ${p.subcategory || ''}`.toLowerCase();
        return keywords.some(kw => fullText.includes(kw.toLowerCase()));
      });

      const productIds = matchingProducts.map(p => p.id);

      // Current inventory
      let currentStock = 0;
      if (productIds.length > 0) {
        const invSnapshots = await db.inventorySnapshot.findMany({
          where: {
            storeId: DEFAULT_STORE_ID,
            productId: { in: productIds },
          },
          orderBy: { snapshotDate: 'desc' },
          take: productIds.length * 2,
        });

        const seenProduct = new Set<string>();
        for (const inv of invSnapshots) {
          if (!seenProduct.has(inv.productId)) {
            seenProduct.add(inv.productId);
            currentStock += inv.onHandQty;
          }
        }
      }

      // Check historical POS evidence
      let festivalDemandTotal = 0;
      let festivalDaysTotal = 0;
      let baselineDemandTotal = 0;
      let baselineDaysTotal = 0;

      if (productIds.length > 0) {
        // Query historical sales for these products
        const pastSales = await db.sale.findMany({
          where: {
            productId: { in: productIds },
          },
          select: { saleTimestamp: true, quantity: true },
        });

        for (let yearOffset = -1; yearOffset >= -4; yearOffset--) {
          const fs = new Date(festivalStartDate);
          fs.setFullYear(fs.getFullYear() + yearOffset);
          const fe = new Date(festival.endDate);
          fe.setFullYear(fe.getFullYear() + yearOffset);

          const bsStart = new Date(fs);
          bsStart.setDate(bsStart.getDate() - 14);
          const bsEnd = new Date(fe);
          bsEnd.setDate(bsEnd.getDate() + 14);

          for (const s of pastSales) {
            const st = new Date(s.saleTimestamp);
            if (st >= fs && st <= fe) {
              festivalDemandTotal += s.quantity;
              festivalDaysTotal++;
            } else if (st >= bsStart && st <= bsEnd) {
              baselineDemandTotal += s.quantity;
              baselineDaysTotal++;
            }
          }
        }
      }

      const dailyFestival = festivalDaysTotal > 0 ? festivalDemandTotal / festivalDaysTotal : 0;
      const dailyBaseline = baselineDaysTotal > 0 ? baselineDemandTotal / baselineDaysTotal : 0;

      let hasHistoricalData = false;
      let demandUpliftText = 'Insufficient historical evidence';
      let confidence = 'Low';
      let upliftValue = 0;

      if (baselineDaysTotal > 0 && dailyBaseline > 0 && festivalDaysTotal > 0) {
        hasHistoricalData = true;
        upliftValue = (dailyFestival - dailyBaseline) / dailyBaseline;
        const upliftPct = Math.round(upliftValue * 100);

        if (upliftPct > 0) {
          demandUpliftText = `+${upliftPct}% vs baseline`;
        } else {
          demandUpliftText = `Normal baseline levels (${upliftPct}%)`;
        }
        confidence = festivalDaysTotal >= 10 ? 'High' : 'Medium';
      }

      // Estimate avg daily demand from last 28 days
      let avgDailyDemand = 10; // Default baseline
      if (productIds.length > 0) {
        const recent28d = new Date();
        recent28d.setDate(recent28d.getDate() - 28);
        const recentSales = await db.sale.findMany({
          where: {
            productId: { in: productIds },
            saleTimestamp: { gte: recent28d },
          },
          select: { quantity: true },
        });
        const totalQty = recentSales.reduce((acc, s) => acc + s.quantity, 0);
        if (totalQty > 0) {
          avgDailyDemand = Math.max(1, Math.round(totalQty / 28));
        }
      }

      const leadTimeDays = 4; // Average supplier lead time
      const leadTimeDemand = Math.ceil(avgDailyDemand * leadTimeDays);
      const safetyStock = Math.ceil(avgDailyDemand * 3);

      const effectiveUplift = hasHistoricalData ? Math.max(0, upliftValue) : (festival.importance * 0.4);
      const expectedFestivalDemand = Math.ceil(avgDailyDemand * 14 * (1 + effectiveUplift));

      const recommendedMinimumStock = expectedFestivalDemand + leadTimeDemand + safetyStock;
      const recommendedOrderQty = Math.max(0, recommendedMinimumStock - currentStock);

      // Priority status
      let priority: 'HIGH' | 'MEDIUM' | 'HEALTHY' = 'HEALTHY';
      let statusBadge = '🟢 Stock sufficient';

      if (currentStock < recommendedMinimumStock * 0.6 || (recommendedOrderQty > 0 && currentStock === 0)) {
        priority = 'HIGH';
        statusBadge = '🔴 Stock up required';
      } else if (currentStock < recommendedMinimumStock) {
        priority = 'MEDIUM';
        statusBadge = '🟠 Consider ordering';
      }

      categoryAlerts.push({
        categoryName,
        expectedImpact,
        currentStock,
        expectedFestivalDemand,
        recommendedMinimumStock,
        recommendedOrderQty,
        priority,
        statusBadge,
        hasHistoricalData,
        demandUpliftText,
        confidence,
        matchingProductCount: matchingProducts.length,
      });
    }

    // Sort alerts: HIGH first, then MEDIUM, then HEALTHY
    const priorityOrder = { HIGH: 1, MEDIUM: 2, HEALTHY: 3 };
    categoryAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const highPriorityCount = categoryAlerts.filter(a => a.priority === 'HIGH').length;

    // AI Insight summary
    const insight = `${festival.name} is approaching in ${daysRemaining} days. ` +
      (highPriorityCount > 0
        ? `Immediate action required: ${highPriorityCount} candidate categories show inventory deficits.`
        : `Current stock levels cover forecasted demand across candidate categories.`);

    return NextResponse.json({
      festival: {
        id: festival.id,
        name: festival.name,
        eventType: festival.eventType,
        startDate: festival.startDate,
        endDate: festival.endDate,
        formattedDate: new Date(festival.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        daysRemaining,
        region: festival.region,
        importance: festival.importance,
        categories: festival.categories,
      },
      insight,
      categoryAlerts,
      summary: {
        totalCategories: categoryAlerts.length,
        highPriorityCount,
        mediumPriorityCount: categoryAlerts.filter(a => a.priority === 'MEDIUM').length,
        healthyCount: categoryAlerts.filter(a => a.priority === 'HEALTHY').length,
        actionRequired: highPriorityCount > 0,
      }
    });

  } catch (error: any) {
    console.error('Error in festival proactive alerts API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

function getFestivalCategoryConfigs(festivalName: string, festivalCategoriesStr: string | null) {
  const fName = festivalName.toLowerCase();

  if (fName.includes('diwali')) {
    return [
      { categoryName: 'Gift Packs', expectedImpact: 'High', keywords: ['gift', 'chocolate', 'box', 'combo'] },
      { categoryName: 'Packed Sweets', expectedImpact: 'High', keywords: ['sweet', 'cake', 'bakery', 'biscuit', 'cookie'] },
      { categoryName: 'Chocolates', expectedImpact: 'High', keywords: ['chocolate', 'snack'] },
      { categoryName: 'Dry Fruits', expectedImpact: 'High', keywords: ['dry fruit', 'nut', 'almond', 'cashew', 'staple'] },
      { categoryName: 'Beverages & Soft Drinks', expectedImpact: 'Medium', keywords: ['beverage', 'drink', 'juice', 'soda'] },
      { categoryName: 'Festival Decorations & Pooja', expectedImpact: 'High', keywords: ['pooja', 'diya', 'oil', 'brass', 'cleaning'] },
    ];
  }

  if (fName.includes('holi')) {
    return [
      { categoryName: 'Colors & Gulal', expectedImpact: 'High', keywords: ['color', 'gulal', 'pooja'] },
      { categoryName: 'Water Balloons & Accessories', expectedImpact: 'High', keywords: ['balloon', 'toy', 'accessories'] },
      { categoryName: 'Snacks & Savories', expectedImpact: 'High', keywords: ['snack', 'biscuit', 'noodle', 'cookie'] },
      { categoryName: 'Cold Drinks & Thandai', expectedImpact: 'High', keywords: ['beverage', 'drink', 'soft drink'] },
      { categoryName: 'Sweets & Gujiya', expectedImpact: 'High', keywords: ['sweet', 'bakery', 'cake'] },
      { categoryName: 'Disposable Items', expectedImpact: 'Medium', keywords: ['disposable', 'storage', 'cleaning'] },
    ];
  }

  if (fName.includes('christmas') || fName.includes('new year')) {
    return [
      { categoryName: 'Chocolates', expectedImpact: 'High', keywords: ['chocolate', 'snack'] },
      { categoryName: 'Cakes & Bakery Products', expectedImpact: 'High', keywords: ['cake', 'bakery', 'bread', 'bun'] },
      { categoryName: 'Gift Packs', expectedImpact: 'High', keywords: ['gift', 'chocolate', 'box'] },
      { categoryName: 'Beverages & Juices', expectedImpact: 'High', keywords: ['beverage', 'drink', 'health drink'] },
      { categoryName: 'Decorations', expectedImpact: 'Medium', keywords: ['pooja', 'cleaning', 'household'] },
    ];
  }

  if (fName.includes('dussehra')) {
    return [
      { categoryName: 'Packed Sweets', expectedImpact: 'High', keywords: ['sweet', 'bakery', 'cake', 'biscuit'] },
      { categoryName: 'Gift Packs', expectedImpact: 'High', keywords: ['gift', 'chocolate', 'box'] },
      { categoryName: 'Decoratives & Pooja Needs', expectedImpact: 'High', keywords: ['pooja', 'oil', 'brass'] },
      { categoryName: 'Snacks & Beverages', expectedImpact: 'Medium', keywords: ['snack', 'beverage', 'drink'] },
    ];
  }

  if (fName.includes('eid')) {
    return [
      { categoryName: 'Packed Sweets & Sevaiyan', expectedImpact: 'High', keywords: ['sweet', 'bakery', 'staple'] },
      { categoryName: 'Dry Fruits & Nuts', expectedImpact: 'High', keywords: ['dry fruit', 'nut', 'staple'] },
      { categoryName: 'Gift Packs', expectedImpact: 'High', keywords: ['gift', 'chocolate'] },
      { categoryName: 'Beverages', expectedImpact: 'Medium', keywords: ['beverage', 'drink'] },
    ];
  }

  // Fallback to festival.categories
  if (festivalCategoriesStr) {
    const cats = festivalCategoriesStr.split(',').map(c => c.trim());
    return cats.map(c => ({
      categoryName: c,
      expectedImpact: 'Medium',
      keywords: [c.toLowerCase()],
    }));
  }

  return [
    { categoryName: 'Sweets & Confectionery', expectedImpact: 'High', keywords: ['sweet', 'bakery', 'chocolate'] },
    { categoryName: 'Snacks & Beverages', expectedImpact: 'Medium', keywords: ['snack', 'beverage', 'drink'] },
    { categoryName: 'Festival Supplies', expectedImpact: 'Medium', keywords: ['pooja', 'cleaning', 'oil'] },
  ];
}
