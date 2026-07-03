import { DailyCropPrice } from '../models/index.js';
import { CROPS } from '../data/cropDatabase.js';
import { MARKETS } from '../data/marketDatabase.js';
import { HISTORICAL_PRICES } from '../data/historicalPrices.js';

// Seed or update daily crop prices across all markets
export async function syncDailyPrices() {
  try {
    const currentMonth = new Date().getMonth() + 1;
    let createdCount = 0;
    let updatedCount = 0;

    // For each crop in our database
    for (const crop of CROPS) {
      // Find historical price profile
      const priceProfile = HISTORICAL_PRICES.find(h => h.cropId === crop.id);
      const baseMonthlyPrice = priceProfile 
        ? priceProfile.monthlyAvgPrices[currentMonth - 1] 
        : crop.avgMarketPrice;

      // Update price for each market
      for (const market of MARKETS) {
        // Check if a daily price entry already exists
        let entry = await DailyCropPrice.findOne({ cropId: crop.id, marketId: market.id });

        // Introduce small day-to-day random fluctuation (between -2.5% and +2.5%)
        // to represent live mandi price behavior
        const randomFactor = 0.975 + Math.random() * 0.05;
        let newPrice = Math.round(baseMonthlyPrice * randomFactor);

        // Make sure price doesn't go below a floor (e.g. 50% of avg price)
        const floorPrice = Math.round(crop.avgMarketPrice * 0.5);
        if (newPrice < floorPrice) newPrice = floorPrice;

        if (!entry) {
          await DailyCropPrice.create({
            cropId: crop.id,
            marketId: market.id,
            pricePerQuintal: newPrice,
            lastUpdated: new Date()
          });
          createdCount++;
        } else {
          // Only update if not updated in the last 12 hours (prevents infinite resets on start)
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
          if (entry.lastUpdated < twelveHoursAgo) {
            entry.pricePerQuintal = newPrice;
            entry.lastUpdated = new Date();
            await entry.save();
            updatedCount++;
          }
        }
      }
    }

    if (createdCount > 0 || updatedCount > 0) {
      console.log(`Daily Crop Price Sync completed: Seeded ${createdCount} entries, updated ${updatedCount} entries.`);
    }
  } catch (error) {
    console.error('Error in daily crop price sync service:', error);
  }
}
