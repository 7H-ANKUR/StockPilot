/**
 * Indian Festival Calendar & Intelligence Engine
 * 
 * Provides verified multi-year lunisolar dates for major Indian retail festivals.
 * Spans:
 *  - Historical retail years (2015-2018) for sales correlation & uplift modeling
 *  - Active & upcoming years (2024-2027) for live operational reorder buffers
 */

import { db } from '@/lib/db';

export interface FestivalDefinition {
  name: string;
  eventType: 'CULTURAL' | 'NATIONAL' | 'COMMERCIAL';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  region: 'ALL_INDIA' | 'NORTH_INDIA' | 'WEST_INDIA' | 'SOUTH_INDIA' | 'EAST_INDIA';
  importance: number; // 0.0 to 1.0
  categories: string; // Comma-separated product categories
}

export const INDIAN_FESTIVALS: FestivalDefinition[] = [
  // ==========================================
  // DIWALI (Deepavali - 5 Day Festive Period)
  // Dhanteras -> Naraka Chaturdashi -> Lakshmi Puja -> Govardhan Puja -> Bhai Dooj
  // ==========================================
  { name: 'Diwali', eventType: 'CULTURAL', startDate: '2026-11-06', endDate: '2026-11-10', region: 'ALL_INDIA', importance: 1.0, categories: 'Sweets,Snacks,Gifts,Decoratives,Dry Fruits,Pooja Items' },
  { name: 'Diwali', eventType: 'CULTURAL', startDate: '2025-10-18', endDate: '2025-10-22', region: 'ALL_INDIA', importance: 1.0, categories: 'Sweets,Snacks,Gifts,Decoratives,Dry Fruits,Pooja Items' },
  { name: 'Diwali', eventType: 'CULTURAL', startDate: '2027-10-27', endDate: '2027-10-31', region: 'ALL_INDIA', importance: 1.0, categories: 'Sweets,Snacks,Gifts,Decoratives,Dry Fruits,Pooja Items' },
  { name: 'Diwali', eventType: 'CULTURAL', startDate: '2018-11-05', endDate: '2018-11-09', region: 'ALL_INDIA', importance: 1.0, categories: 'Sweets,Snacks,Gifts,Decoratives,Dry Fruits,Pooja Items' },
  { name: 'Diwali', eventType: 'CULTURAL', startDate: '2017-10-17', endDate: '2017-10-21', region: 'ALL_INDIA', importance: 1.0, categories: 'Sweets,Snacks,Gifts,Decoratives,Dry Fruits,Pooja Items' },
  { name: 'Diwali', eventType: 'CULTURAL', startDate: '2016-10-28', endDate: '2016-11-01', region: 'ALL_INDIA', importance: 1.0, categories: 'Sweets,Snacks,Gifts,Decoratives,Dry Fruits,Pooja Items' },
  { name: 'Diwali', eventType: 'CULTURAL', startDate: '2015-11-09', endDate: '2015-11-13', region: 'ALL_INDIA', importance: 1.0, categories: 'Sweets,Snacks,Gifts,Decoratives,Dry Fruits,Pooja Items' },

  // ==========================================
  // SHARAD NAVRATRI / DURGA PUJA
  // ==========================================
  { name: 'Navratri', eventType: 'CULTURAL', startDate: '2026-10-11', endDate: '2026-10-19', region: 'WEST_INDIA', importance: 0.85, categories: 'Snacks,Fasting Items,Fruits,Dairy,Decoratives' },
  { name: 'Navratri', eventType: 'CULTURAL', startDate: '2025-09-22', endDate: '2025-10-01', region: 'WEST_INDIA', importance: 0.85, categories: 'Snacks,Fasting Items,Fruits,Dairy,Decoratives' },
  { name: 'Navratri', eventType: 'CULTURAL', startDate: '2027-09-30', endDate: '2027-10-09', region: 'WEST_INDIA', importance: 0.85, categories: 'Snacks,Fasting Items,Fruits,Dairy,Decoratives' },
  { name: 'Navratri', eventType: 'CULTURAL', startDate: '2018-10-10', endDate: '2018-10-18', region: 'WEST_INDIA', importance: 0.85, categories: 'Snacks,Fasting Items,Fruits,Dairy,Decoratives' },
  { name: 'Navratri', eventType: 'CULTURAL', startDate: '2017-09-21', endDate: '2017-09-29', region: 'WEST_INDIA', importance: 0.85, categories: 'Snacks,Fasting Items,Fruits,Dairy,Decoratives' },
  { name: 'Navratri', eventType: 'CULTURAL', startDate: '2016-10-01', endDate: '2016-10-10', region: 'WEST_INDIA', importance: 0.85, categories: 'Snacks,Fasting Items,Fruits,Dairy,Decoratives' },
  { name: 'Navratri', eventType: 'CULTURAL', startDate: '2015-10-13', endDate: '2015-10-22', region: 'WEST_INDIA', importance: 0.85, categories: 'Snacks,Fasting Items,Fruits,Dairy,Decoratives' },

  // ==========================================
  // DUSSEHRA (Vijayadashami)
  // ==========================================
  { name: 'Dussehra', eventType: 'CULTURAL', startDate: '2026-10-20', endDate: '2026-10-20', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Decoratives,Pooja Items' },
  { name: 'Dussehra', eventType: 'CULTURAL', startDate: '2025-10-02', endDate: '2025-10-02', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Decoratives,Pooja Items' },
  { name: 'Dussehra', eventType: 'CULTURAL', startDate: '2027-10-10', endDate: '2027-10-10', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Decoratives,Pooja Items' },
  { name: 'Dussehra', eventType: 'CULTURAL', startDate: '2018-10-19', endDate: '2018-10-19', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Decoratives,Pooja Items' },
  { name: 'Dussehra', eventType: 'CULTURAL', startDate: '2017-09-30', endDate: '2017-09-30', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Decoratives,Pooja Items' },
  { name: 'Dussehra', eventType: 'CULTURAL', startDate: '2016-10-11', endDate: '2016-10-11', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Decoratives,Pooja Items' },
  { name: 'Dussehra', eventType: 'CULTURAL', startDate: '2015-10-22', endDate: '2015-10-22', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Decoratives,Pooja Items' },

  // ==========================================
  // KARWA CHAUTH
  // ==========================================
  { name: 'Karwa Chauth', eventType: 'CULTURAL', startDate: '2026-10-29', endDate: '2026-10-29', region: 'NORTH_INDIA', importance: 0.75, categories: 'Sweets,Gifts,Dry Fruits,Fasting Items,Cosmetics' },
  { name: 'Karwa Chauth', eventType: 'CULTURAL', startDate: '2025-10-10', endDate: '2025-10-10', region: 'NORTH_INDIA', importance: 0.75, categories: 'Sweets,Gifts,Dry Fruits,Fasting Items,Cosmetics' },
  { name: 'Karwa Chauth', eventType: 'CULTURAL', startDate: '2027-10-18', endDate: '2027-10-18', region: 'NORTH_INDIA', importance: 0.75, categories: 'Sweets,Gifts,Dry Fruits,Fasting Items,Cosmetics' },
  { name: 'Karwa Chauth', eventType: 'CULTURAL', startDate: '2018-10-27', endDate: '2018-10-27', region: 'NORTH_INDIA', importance: 0.75, categories: 'Sweets,Gifts,Dry Fruits,Fasting Items,Cosmetics' },
  { name: 'Karwa Chauth', eventType: 'CULTURAL', startDate: '2017-10-08', endDate: '2017-10-08', region: 'NORTH_INDIA', importance: 0.75, categories: 'Sweets,Gifts,Dry Fruits,Fasting Items,Cosmetics' },

  // ==========================================
  // CHHATH PUJA
  // ==========================================
  { name: 'Chhath Puja', eventType: 'CULTURAL', startDate: '2026-11-14', endDate: '2026-11-15', region: 'EAST_INDIA', importance: 0.8, categories: 'Fruits,Grains,Ghee,Pooja Items,Utensils' },
  { name: 'Chhath Puja', eventType: 'CULTURAL', startDate: '2025-10-27', endDate: '2025-10-28', region: 'EAST_INDIA', importance: 0.8, categories: 'Fruits,Grains,Ghee,Pooja Items,Utensils' },
  { name: 'Chhath Puja', eventType: 'CULTURAL', startDate: '2027-11-03', endDate: '2027-11-04', region: 'EAST_INDIA', importance: 0.8, categories: 'Fruits,Grains,Ghee,Pooja Items,Utensils' },
  { name: 'Chhath Puja', eventType: 'CULTURAL', startDate: '2018-11-13', endDate: '2018-11-14', region: 'EAST_INDIA', importance: 0.8, categories: 'Fruits,Grains,Ghee,Pooja Items,Utensils' },
  { name: 'Chhath Puja', eventType: 'CULTURAL', startDate: '2017-10-26', endDate: '2017-10-27', region: 'EAST_INDIA', importance: 0.8, categories: 'Fruits,Grains,Ghee,Pooja Items,Utensils' },

  // ==========================================
  // CHRISTMAS
  // ==========================================
  { name: 'Christmas', eventType: 'CULTURAL', startDate: '2026-12-24', endDate: '2026-12-26', region: 'ALL_INDIA', importance: 0.75, categories: 'Bakery,Cakes,Sweets,Decoratives,Gifts,Beverages' },
  { name: 'Christmas', eventType: 'CULTURAL', startDate: '2025-12-24', endDate: '2025-12-26', region: 'ALL_INDIA', importance: 0.75, categories: 'Bakery,Cakes,Sweets,Decoratives,Gifts,Beverages' },
  { name: 'Christmas', eventType: 'CULTURAL', startDate: '2027-12-24', endDate: '2027-12-26', region: 'ALL_INDIA', importance: 0.75, categories: 'Bakery,Cakes,Sweets,Decoratives,Gifts,Beverages' },
  { name: 'Christmas', eventType: 'CULTURAL', startDate: '2018-12-24', endDate: '2018-12-26', region: 'ALL_INDIA', importance: 0.75, categories: 'Bakery,Cakes,Sweets,Decoratives,Gifts,Beverages' },
  { name: 'Christmas', eventType: 'CULTURAL', startDate: '2017-12-24', endDate: '2017-12-26', region: 'ALL_INDIA', importance: 0.75, categories: 'Bakery,Cakes,Sweets,Decoratives,Gifts,Beverages' },

  // ==========================================
  // NEW YEAR
  // ==========================================
  { name: 'New Year', eventType: 'COMMERCIAL', startDate: '2026-12-31', endDate: '2027-01-01', region: 'ALL_INDIA', importance: 0.7, categories: 'Beverages,Snacks,Confectionery,Party Supplies' },
  { name: 'New Year', eventType: 'COMMERCIAL', startDate: '2025-12-31', endDate: '2026-01-01', region: 'ALL_INDIA', importance: 0.7, categories: 'Beverages,Snacks,Confectionery,Party Supplies' },

  // ==========================================
  // MAKAR SANKRANTI / PONGAL / LOHRI
  // ==========================================
  { name: 'Pongal', eventType: 'CULTURAL', startDate: '2027-01-14', endDate: '2027-01-17', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Jaggery,Ghee,Sweets' },
  { name: 'Pongal', eventType: 'CULTURAL', startDate: '2026-01-14', endDate: '2026-01-17', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Jaggery,Ghee,Sweets' },
  { name: 'Pongal', eventType: 'CULTURAL', startDate: '2025-01-14', endDate: '2025-01-17', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Jaggery,Ghee,Sweets' },
  { name: 'Pongal', eventType: 'CULTURAL', startDate: '2018-01-14', endDate: '2018-01-17', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Jaggery,Ghee,Sweets' },
  { name: 'Pongal', eventType: 'CULTURAL', startDate: '2017-01-14', endDate: '2017-01-17', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Jaggery,Ghee,Sweets' },

  // ==========================================
  // REPUBLIC DAY
  // ==========================================
  { name: 'Republic Day', eventType: 'NATIONAL', startDate: '2027-01-26', endDate: '2027-01-26', region: 'ALL_INDIA', importance: 0.4, categories: 'All,Retail Promotions,Snacks' },
  { name: 'Republic Day', eventType: 'NATIONAL', startDate: '2026-01-26', endDate: '2026-01-26', region: 'ALL_INDIA', importance: 0.4, categories: 'All,Retail Promotions,Snacks' },
  { name: 'Republic Day', eventType: 'NATIONAL', startDate: '2025-01-26', endDate: '2025-01-26', region: 'ALL_INDIA', importance: 0.4, categories: 'All,Retail Promotions,Snacks' },

  // ==========================================
  // HOLI
  // ==========================================
  { name: 'Holi', eventType: 'CULTURAL', startDate: '2026-03-03', endDate: '2026-03-04', region: 'NORTH_INDIA', importance: 0.85, categories: 'Colors,Sweets,Beverages,Dairy,Snacks' },
  { name: 'Holi', eventType: 'CULTURAL', startDate: '2025-03-14', endDate: '2025-03-15', region: 'NORTH_INDIA', importance: 0.85, categories: 'Colors,Sweets,Beverages,Dairy,Snacks' },
  { name: 'Holi', eventType: 'CULTURAL', startDate: '2027-03-22', endDate: '2027-03-23', region: 'NORTH_INDIA', importance: 0.85, categories: 'Colors,Sweets,Beverages,Dairy,Snacks' },
  { name: 'Holi', eventType: 'CULTURAL', startDate: '2018-03-01', endDate: '2018-03-02', region: 'NORTH_INDIA', importance: 0.85, categories: 'Colors,Sweets,Beverages,Dairy,Snacks' },
  { name: 'Holi', eventType: 'CULTURAL', startDate: '2017-03-12', endDate: '2017-03-13', region: 'NORTH_INDIA', importance: 0.85, categories: 'Colors,Sweets,Beverages,Dairy,Snacks' },
  { name: 'Holi', eventType: 'CULTURAL', startDate: '2016-03-23', endDate: '2016-03-24', region: 'NORTH_INDIA', importance: 0.85, categories: 'Colors,Sweets,Beverages,Dairy,Snacks' },
  { name: 'Holi', eventType: 'CULTURAL', startDate: '2015-03-05', endDate: '2015-03-06', region: 'NORTH_INDIA', importance: 0.85, categories: 'Colors,Sweets,Beverages,Dairy,Snacks' },

  // ==========================================
  // EID AL-FITR
  // ==========================================
  { name: 'Eid al-Fitr', eventType: 'CULTURAL', startDate: '2026-03-20', endDate: '2026-03-21', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Dry Fruits,Gifts,Dairy,Apparel' },
  { name: 'Eid al-Fitr', eventType: 'CULTURAL', startDate: '2025-03-31', endDate: '2025-04-01', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Dry Fruits,Gifts,Dairy,Apparel' },
  { name: 'Eid al-Fitr', eventType: 'CULTURAL', startDate: '2027-03-10', endDate: '2027-03-11', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Dry Fruits,Gifts,Dairy,Apparel' },
  { name: 'Eid al-Fitr', eventType: 'CULTURAL', startDate: '2018-06-15', endDate: '2018-06-16', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Dry Fruits,Gifts,Dairy,Apparel' },
  { name: 'Eid al-Fitr', eventType: 'CULTURAL', startDate: '2017-06-25', endDate: '2017-06-26', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Dry Fruits,Gifts,Dairy,Apparel' },
  { name: 'Eid al-Fitr', eventType: 'CULTURAL', startDate: '2016-07-06', endDate: '2016-07-07', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Dry Fruits,Gifts,Dairy,Apparel' },
  { name: 'Eid al-Fitr', eventType: 'CULTURAL', startDate: '2015-07-18', endDate: '2015-07-19', region: 'ALL_INDIA', importance: 0.85, categories: 'Sweets,Dry Fruits,Gifts,Dairy,Apparel' },

  // ==========================================
  // RAKSHA BANDHAN
  // ==========================================
  { name: 'Raksha Bandhan', eventType: 'CULTURAL', startDate: '2026-08-28', endDate: '2026-08-28', region: 'ALL_INDIA', importance: 0.8, categories: 'Sweets,Gifts,Chocolates,Decoratives' },
  { name: 'Raksha Bandhan', eventType: 'CULTURAL', startDate: '2025-08-09', endDate: '2025-08-09', region: 'ALL_INDIA', importance: 0.8, categories: 'Sweets,Gifts,Chocolates,Decoratives' },
  { name: 'Raksha Bandhan', eventType: 'CULTURAL', startDate: '2027-08-17', endDate: '2027-08-17', region: 'ALL_INDIA', importance: 0.8, categories: 'Sweets,Gifts,Chocolates,Decoratives' },
  { name: 'Raksha Bandhan', eventType: 'CULTURAL', startDate: '2018-08-26', endDate: '2018-08-26', region: 'ALL_INDIA', importance: 0.8, categories: 'Sweets,Gifts,Chocolates,Decoratives' },
  { name: 'Raksha Bandhan', eventType: 'CULTURAL', startDate: '2017-08-07', endDate: '2017-08-07', region: 'ALL_INDIA', importance: 0.8, categories: 'Sweets,Gifts,Chocolates,Decoratives' },

  // ==========================================
  // INDEPENDENCE DAY
  // ==========================================
  { name: 'Independence Day', eventType: 'NATIONAL', startDate: '2026-08-15', endDate: '2026-08-15', region: 'ALL_INDIA', importance: 0.4, categories: 'All,Retail Promotions,Snacks' },
  { name: 'Independence Day', eventType: 'NATIONAL', startDate: '2025-08-15', endDate: '2025-08-15', region: 'ALL_INDIA', importance: 0.4, categories: 'All,Retail Promotions,Snacks' },
  { name: 'Independence Day', eventType: 'NATIONAL', startDate: '2027-08-15', endDate: '2027-08-15', region: 'ALL_INDIA', importance: 0.4, categories: 'All,Retail Promotions,Snacks' },

  // ==========================================
  // JANMASHTAMI
  // ==========================================
  { name: 'Janmashtami', eventType: 'CULTURAL', startDate: '2026-09-04', endDate: '2026-09-04', region: 'NORTH_INDIA', importance: 0.75, categories: 'Dairy,Milk,Butter,Sweets,Pooja Items' },
  { name: 'Janmashtami', eventType: 'CULTURAL', startDate: '2025-08-16', endDate: '2025-08-16', region: 'NORTH_INDIA', importance: 0.75, categories: 'Dairy,Milk,Butter,Sweets,Pooja Items' },

  // ==========================================
  // GANESH CHATURTHI
  // ==========================================
  { name: 'Ganesh Chaturthi', eventType: 'CULTURAL', startDate: '2026-09-14', endDate: '2026-09-24', region: 'WEST_INDIA', importance: 0.85, categories: 'Sweets,Modak,Fruits,Pooja Items,Decoratives' },
  { name: 'Ganesh Chaturthi', eventType: 'CULTURAL', startDate: '2025-08-27', endDate: '2025-09-06', region: 'WEST_INDIA', importance: 0.85, categories: 'Sweets,Modak,Fruits,Pooja Items,Decoratives' },
  { name: 'Ganesh Chaturthi', eventType: 'CULTURAL', startDate: '2027-09-04', endDate: '2027-09-14', region: 'WEST_INDIA', importance: 0.85, categories: 'Sweets,Modak,Fruits,Pooja Items,Decoratives' },

  // ==========================================
  // ONAM
  // ==========================================
  { name: 'Onam', eventType: 'CULTURAL', startDate: '2026-08-24', endDate: '2026-09-03', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Vegetables,Sweets,Snacks,Decoratives' },
  { name: 'Onam', eventType: 'CULTURAL', startDate: '2025-09-04', endDate: '2025-09-06', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Vegetables,Sweets,Snacks,Decoratives' },
  { name: 'Onam', eventType: 'CULTURAL', startDate: '2027-09-11', endDate: '2027-09-14', region: 'SOUTH_INDIA', importance: 0.8, categories: 'Rice,Vegetables,Sweets,Snacks,Decoratives' },
];

/**
 * Seed or update all festivals in the database.
 * Replaces old single-year incorrect entries with verified multi-year lunisolar dates.
 */
export async function seedIndianFestivals() {
  let createdCount = 0;
  let updatedCount = 0;

  for (const f of INDIAN_FESTIVALS) {
    const sDate = new Date(`${f.startDate}T00:00:00.000Z`);
    const eDate = new Date(`${f.endDate}T23:59:59.999Z`);

    // Match on name and starting year
    const startYear = sDate.getUTCFullYear();
    const existing = await db.festival.findFirst({
      where: {
        name: f.name,
        startDate: {
          gte: new Date(`${startYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${startYear}-12-31T23:59:59.999Z`),
        },
      },
    });

    if (existing) {
      await db.festival.update({
        where: { id: existing.id },
        data: {
          eventType: f.eventType,
          startDate: sDate,
          endDate: eDate,
          region: f.region,
          importance: f.importance,
          categories: f.categories,
        },
      });
      updatedCount++;
    } else {
      await db.festival.create({
        data: {
          name: f.name,
          eventType: f.eventType,
          startDate: sDate,
          endDate: eDate,
          region: f.region,
          importance: f.importance,
          categories: f.categories,
        },
      });
      createdCount++;
    }
  }

  return { created: createdCount, updated: updatedCount, total: INDIAN_FESTIVALS.length };
}
