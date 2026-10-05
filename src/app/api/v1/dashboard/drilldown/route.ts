import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLatestSaleDate } from '@/lib/dates';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const metric = url.searchParams.get('metric') || 'transactions';
    const period = url.searchParams.get('period') || '30d';
    const riskType = url.searchParams.get('riskType') || 'ALL';
    const search = (url.searchParams.get('search') || '').toLowerCase().trim();

    // Determine date range anchored on actual data range
    const latestDate = await getLatestSaleDate();
    const maxMs = latestDate.getTime();
    let minMs = 0;

    if (period === 'today') {
      minMs = maxMs - 24 * 3600 * 1000;
    } else if (period === '7d') {
      minMs = maxMs - 7 * 86400 * 1000;
    } else if (period === '30d') {
      minMs = maxMs - 30 * 86400 * 1000;
    } else if (period === 'month') {
      // 1st of the month of the latest sale
      const d = new Date(maxMs);
      minMs = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).getTime();
    } else if (period === 'year') {
      // 1st of January of the year of the latest sale
      const d = new Date(maxMs);
      minMs = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();
    } else {
      // 'all'
      minMs = 0;
    }

    // =========================================================================
    // 1. TRANSACTIONS DRILLDOWN (Detailed Payment Breakdown)
    // =========================================================================
    if (metric === 'transactions') {
      const rows: any = await db.$queryRawUnsafe(`
        SELECT 
          COALESCE(paymentType, 'CASH') as method,
          COUNT(*) as txCount,
          COALESCE(SUM(netSales), 0) as totalAmount
        FROM Sale
        WHERE saleTimestamp >= ${minMs} AND saleTimestamp <= ${maxMs}
        GROUP BY method
        ORDER BY txCount DESC
      `);

      const totalTx = rows.reduce((s: number, r: any) => s + Number(r.txCount || 0), 0);
      const totalAmount = rows.reduce((s: number, r: any) => s + Number(r.totalAmount || 0), 0);

      // Method display label map
      const methodLabels: Record<string, string> = {
        UPI: 'UPI',
        CARD: 'Card',
        CASH: 'Cash',
        BANK_TRANSFER: 'Bank Transfer',
      };

      const breakdown = rows.map((r: any) => {
        const rawMethod = String(r.method || 'CASH');
        const count = Number(r.txCount || 0);
        const amount = Number(r.totalAmount || 0);
        const percentage = totalTx > 0 ? (count / totalTx) * 100 : 0;
        const amountPercentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
        return {
          key: rawMethod,
          method: methodLabels[rawMethod] || rawMethod,
          count,
          amount: Math.round(amount * 100) / 100,
          percentage: Math.round(percentage * 10) / 10,
          amountPercentage: Math.round(amountPercentage * 10) / 10,
        };
      });

      // Recent transactions sample
      const recentSales: any = await db.$queryRawUnsafe(`
        SELECT 
          s.id,
          s.saleTimestamp,
          s.quantity,
          s.netSales,
          s.paymentType,
          s.customerName,
          s.region,
          p.name as productName,
          p.brand
        FROM Sale s
        LEFT JOIN Product p ON s.productId = p.id
        WHERE s.saleTimestamp >= ${minMs} AND s.saleTimestamp <= ${maxMs}
        ORDER BY s.saleTimestamp DESC
        LIMIT 12
      `);

      const recentTransactions = recentSales.map((s: any) => ({
        id: s.id,
        date: new Date(Number(s.saleTimestamp)).toISOString(),
        productName: s.productName || 'Supermarket Item',
        brand: s.brand || 'General',
        quantity: Number(s.quantity || 1),
        amount: Math.round(Number(s.netSales || 0) * 100) / 100,
        paymentMethod: methodLabels[s.paymentType] || s.paymentType,
        customerName: s.customerName || 'Walk-in Customer',
        region: s.region || 'Store POS',
      }));

      return NextResponse.json({
        metric: 'transactions',
        period,
        dateRange: {
          start: new Date(minMs).toISOString(),
          end: new Date(maxMs).toISOString(),
        },
        totalTransactions: totalTx,
        totalPaymentValue: Math.round(totalAmount * 100) / 100,
        breakdown,
        recentTransactions,
      });
    }

    // =========================================================================
    // 2. AVG ORDER VALUE DRILLDOWN (Order Value Analytics & Distribution)
    // =========================================================================
    if (metric === 'aov') {
      const summaryRows: any = await db.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as txCount,
          COALESCE(SUM(netSales), 0) as totalRevenue,
          COALESCE(AVG(netSales), 0) as avgOrderValue,
          COALESCE(MIN(netSales), 0) as minOrderValue,
          COALESCE(MAX(netSales), 0) as maxOrderValue,
          COALESCE(SUM(quantity), 0) as totalUnits,
          COALESCE(AVG(quantity), 0) as avgItemsPerOrder
        FROM Sale
        WHERE saleTimestamp >= ${minMs} AND saleTimestamp <= ${maxMs}
      `);

      const s = summaryRows[0] || {};
      const txCount = Number(s.txCount || 0);
      const totalRevenue = Number(s.totalRevenue || 0);
      const avgOrderValue = Number(s.avgOrderValue || 0);
      const minOrderValue = Number(s.minOrderValue || 0);
      const maxOrderValue = Number(s.maxOrderValue || 0);
      const totalUnits = Number(s.totalUnits || 0);
      const avgItemsPerOrder = Number(s.avgItemsPerOrder || 0);

      // Order value distribution buckets
      const bucketRows: any = await db.$queryRawUnsafe(`
        SELECT 
          CASE 
            WHEN netSales < 500 THEN 'Under ₹500'
            WHEN netSales < 1500 THEN '₹500 - ₹1,500'
            WHEN netSales < 3500 THEN '₹1,500 - ₹3,500'
            WHEN netSales < 7500 THEN '₹3,500 - ₹7,500'
            ELSE 'Above ₹7,500'
          END as bucket,
          COUNT(*) as count,
          SUM(netSales) as amount
        FROM Sale
        WHERE saleTimestamp >= ${minMs} AND saleTimestamp <= ${maxMs}
        GROUP BY bucket
      `);

      const bucketOrder = [
        'Under ₹500',
        '₹500 - ₹1,500',
        '₹1,500 - ₹3,500',
        '₹3,500 - ₹7,500',
        'Above ₹7,500',
      ];

      const distribution = bucketOrder.map((bName) => {
        const found = bucketRows.find((r: any) => r.bucket === bName);
        const count = found ? Number(found.count) : 0;
        const amount = found ? Number(found.amount) : 0;
        const percentage = txCount > 0 ? (count / txCount) * 100 : 0;
        return {
          bucket: bName,
          count,
          amount: Math.round(amount * 100) / 100,
          percentage: Math.round(percentage * 10) / 10,
        };
      });

      return NextResponse.json({
        metric: 'aov',
        period,
        dateRange: {
          start: new Date(minMs).toISOString(),
          end: new Date(maxMs).toISOString(),
        },
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        completedTransactions: txCount,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        highestOrderValue: Math.round(maxOrderValue * 100) / 100,
        lowestOrderValue: Math.round(minOrderValue * 100) / 100,
        totalUnits: Math.round(totalUnits),
        avgItemsPerOrder: Math.round(avgItemsPerOrder * 10) / 10,
        distribution,
      });
    }

    // =========================================================================
    // 3. REVENUE DRILLDOWN (Revenue Details & Trends)
    // =========================================================================
    if (metric === 'revenue') {
      const summaryRows: any = await db.$queryRawUnsafe(`
        SELECT 
          COALESCE(SUM(netSales), 0) as totalRevenue,
          COUNT(*) as txCount
        FROM Sale
        WHERE saleTimestamp >= ${minMs} AND saleTimestamp <= ${maxMs}
      `);

      const totalRevenue = Number(summaryRows[0]?.totalRevenue || 0);

      // Revenue today
      const todayMin = maxMs - 24 * 3600 * 1000;
      const todayRows: any = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM(netSales), 0) as rev FROM Sale WHERE saleTimestamp >= ${todayMin}
      `);
      const revenueToday = Number(todayRows[0]?.rev || 0);

      // Revenue this month
      const dNow = new Date(maxMs);
      const monthMin = new Date(Date.UTC(dNow.getUTCFullYear(), dNow.getUTCMonth(), 1)).getTime();
      const monthRows: any = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM(netSales), 0) as rev FROM Sale WHERE saleTimestamp >= ${monthMin}
      `);
      const revenueThisMonth = Number(monthRows[0]?.rev || 0);

      // Revenue this year
      const yearMin = new Date(Date.UTC(dNow.getUTCFullYear(), 0, 1)).getTime();
      const yearRows: any = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM(netSales), 0) as rev FROM Sale WHERE saleTimestamp >= ${yearMin}
      `);
      const revenueThisYear = Number(yearRows[0]?.rev || 0);

      // Top products by revenue
      const topProductsRaw: any = await db.$queryRawUnsafe(`
        SELECT 
          p.id,
          p.name,
          p.brand,
          p.category,
          p.sellingPrice,
          SUM(s.netSales) as revenue,
          SUM(s.quantity) as qty,
          COUNT(*) as txCount
        FROM Sale s
        JOIN Product p ON s.productId = p.id
        WHERE s.saleTimestamp >= ${minMs} AND s.saleTimestamp <= ${maxMs}
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 8
      `);

      const topProducts = topProductsRaw.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand || 'General',
        category: p.category || 'General',
        price: Number(p.sellingPrice || 0),
        revenue: Math.round(Number(p.revenue || 0) * 100) / 100,
        qty: Number(p.qty || 0),
        transactions: Number(p.txCount || 0),
      }));

      // Top categories by revenue
      const topCategoriesRaw: any = await db.$queryRawUnsafe(`
        SELECT 
          p.category,
          SUM(s.netSales) as revenue,
          COUNT(*) as txCount
        FROM Sale s
        JOIN Product p ON s.productId = p.id
        WHERE s.saleTimestamp >= ${minMs} AND s.saleTimestamp <= ${maxMs}
        GROUP BY p.category
        ORDER BY revenue DESC
        LIMIT 6
      `);

      const topCategories = topCategoriesRaw.map((c: any) => ({
        category: c.category || 'General',
        revenue: Math.round(Number(c.revenue || 0) * 100) / 100,
        transactions: Number(c.txCount || 0),
        percentage: totalRevenue > 0 ? Math.round((Number(c.revenue) / totalRevenue) * 1000) / 10 : 0,
      }));

      return NextResponse.json({
        metric: 'revenue',
        period,
        dateRange: {
          start: new Date(minMs).toISOString(),
          end: new Date(maxMs).toISOString(),
        },
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueToday: Math.round(revenueToday * 100) / 100,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
        revenueThisYear: Math.round(revenueThisYear * 100) / 100,
        topProducts,
        topCategories,
      });
    }

    // =========================================================================
    // 4. STOCKOUT ALERTS DRILLDOWN (Comprehensive Inventory Risk Monitor)
    // =========================================================================
    if (metric === 'stockouts') {
      const thirtyDaysAgo = maxMs - 30 * 86400 * 1000;

      const rawItems: any = await db.$queryRawUnsafe(`
        SELECT 
          p.id as productId,
          p.sku,
          p.name as productName,
          p.brand,
          p.category,
          p.subcategory,
          p.sellingPrice,
          i.onHandQty as currentStock,
          COALESCE(i.reorderPoint, 15) as reorderLevel,
          COALESCE(i.maxStock, 100) as maxStock,
          COALESCE(s.leadTimeDays, 3) as leadTimeDays,
          COALESCE(sup.name, 'National FMCG Distributors') as supplierName,
          COALESCE(sales.qty30, 0) as qty30
        FROM Product p
        JOIN InventorySnapshot i ON p.id = i.productId
        LEFT JOIN SupplierProduct sp ON p.id = sp.productId AND sp.preferred = 1
        LEFT JOIN Supplier s ON sp.supplierId = s.id
        LEFT JOIN Supplier sup ON sp.supplierId = sup.id
        LEFT JOIN (
          SELECT productId, SUM(quantity) as qty30
          FROM Sale
          WHERE saleTimestamp >= ${thirtyDaysAgo}
          GROUP BY productId
        ) sales ON p.id = sales.productId
        GROUP BY p.id
      `);

      const criticalList: any[] = [];
      const lowStockList: any[] = [];
      const watchList: any[] = [];
      const overstockList: any[] = [];

      for (const item of rawItems) {
        const stock = Number(item.currentStock || 0);
        const rp = Number(item.reorderLevel || 15);
        const maxS = Number(item.maxStock || 100);
        const leadTime = Number(item.leadTimeDays || 3);
        const qty30 = Number(item.qty30 || 0);

        // Daily demand estimate (units/day)
        const daily = qty30 > 0 ? Math.max(Math.round((qty30 / 30.0) * 10) / 10, 0.5) : (stock > 0 ? 0.5 : 0);
        const days = daily > 0 ? Math.round((stock / daily) * 10) / 10 : (stock <= 0 ? 0 : 999);
        const recommendedReorder = Math.max(0, Math.ceil(maxS - stock));

        const alertItem = {
          productId: item.productId,
          sku: item.sku,
          productName: item.productName,
          brand: item.brand || 'Other / Unspecified',
          category: item.category || 'General',
          subcategory: item.subcategory || '',
          price: Number(item.sellingPrice || 0),
          currentStock: stock,
          reorderLevel: rp,
          maxStock: maxS,
          dailySales: daily,
          estimatedDaysRemaining: days > 900 ? null : days,
          recommendedReorderQty: recommendedReorder,
          supplier: item.supplierName,
          leadTimeDays: leadTime,
          alertType: '',
          severity: '',
        };

        if (stock <= 0 || days <= leadTime) {
          alertItem.alertType = stock <= 0 ? 'OUT OF STOCK' : 'CRITICAL STOCKOUT RISK';
          alertItem.severity = 'CRITICAL';
          criticalList.push(alertItem);
        } else if (stock <= rp) {
          alertItem.alertType = 'BELOW REORDER LEVEL';
          alertItem.severity = 'LOW_STOCK';
          lowStockList.push(alertItem);
        } else if (stock <= rp * 1.3 || days <= 14) {
          alertItem.alertType = 'APPROACHING REORDER POINT';
          alertItem.severity = 'WATCH';
          watchList.push(alertItem);
        } else if (stock > maxS || (days > 45 && stock > rp * 2)) {
          alertItem.alertType = 'EXCESS INVENTORY / OVERSTOCK';
          alertItem.severity = 'OVERSTOCK';
          overstockList.push(alertItem);
        }
      }

      // Sort by urgency
      criticalList.sort((a, b) => a.currentStock - b.currentStock);
      lowStockList.sort((a, b) => (a.estimatedDaysRemaining || 0) - (b.estimatedDaysRemaining || 0));
      watchList.sort((a, b) => (a.estimatedDaysRemaining || 0) - (b.estimatedDaysRemaining || 0));
      overstockList.sort((a, b) => b.currentStock - a.currentStock);

      let displayedItems: any[] = [];
      if (riskType === 'CRITICAL') displayedItems = criticalList;
      else if (riskType === 'LOW_STOCK') displayedItems = lowStockList;
      else if (riskType === 'WATCH') displayedItems = watchList;
      else if (riskType === 'OVERSTOCK') displayedItems = overstockList;
      else displayedItems = [...criticalList, ...lowStockList, ...watchList, ...overstockList];

      if (search) {
        displayedItems = displayedItems.filter(i =>
          i.productName.toLowerCase().includes(search) ||
          i.brand.toLowerCase().includes(search) ||
          i.category.toLowerCase().includes(search) ||
          i.sku.toLowerCase().includes(search)
        );
      }

      return NextResponse.json({
        metric: 'stockouts',
        counts: {
          critical: criticalList.length,
          lowStock: lowStockList.length,
          watch: watchList.length,
          overstock: overstockList.length,
          totalAlerts: criticalList.length + lowStockList.length + watchList.length + overstockList.length,
        },
        items: displayedItems.slice(0, 100),
        totalItemsCount: displayedItems.length,
      });
    }

    return NextResponse.json({ error: 'Invalid metric specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in dashboard drilldown API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch drilldown data' },
      { status: 500 }
    );
  }
}
