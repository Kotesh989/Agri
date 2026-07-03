import { DailyCropPrice, MandiMarket } from '../models/index.js';
import { CROPS } from '../data/cropDatabase.js';
import { HISTORICAL_PRICES } from '../data/historicalPrices.js';

// Setup background interval execution (every 24 hours starting at 2 AM)
export function startDailyPriceSyncScheduler() {
  const syncInterval = 24 * 60 * 60 * 1000; // 24 hours
  
  const now = new Date();
  const nextTwoAM = new Date();
  nextTwoAM.setHours(2, 0, 0, 0);
  if (nextTwoAM <= now) {
    nextTwoAM.setDate(nextTwoAM.getDate() + 1);
  }
  
  const initialDelay = nextTwoAM.getTime() - now.getTime();
  console.log(`[PriceSync] Scheduled daily crop price sync. Next run in ${Math.round(initialDelay / 1000 / 60)} minutes.`);

  setTimeout(() => {
    syncDailyPrices();
    setInterval(syncDailyPrices, syncInterval);
  }, initialDelay);
}

// Master daily sync controller
export async function syncDailyPrices() {
  console.log('[PriceSync] Initiating daily agricultural price synchronization...');
  
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  let success = false;
  
  if (apiKey) {
    try {
      success = await fetchLivePricesFromGovernmentAPI(apiKey);
    } catch (err) {
      console.error('[PriceSync] Government API Sync failed, falling back to simulation: ', err.message);
    }
  } else {
    console.log('[PriceSync] DATA_GOV_IN_API_KEY is not defined. Using simulated daily APMC price updates.');
  }

  // Fallback to simulated updates if API failed or key was absent
  if (!success) {
    await runSeasonalPriceSimulation();
  }
}

// Fetch live APMC mandi prices from data.gov.in APIs
async function fetchLivePricesFromGovernmentAPI(apiKey) {
  const resourceId = '9ef842f8-9a2f-4404-aa43-6c1b83d1c1d7';
  const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=100`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Data.gov.in returned status code ${response.status}`);
  }

  const json = await response.json();
  const records = json.records || [];
  if (records.length === 0) {
    throw new Error('No records returned from Data.gov.in API');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  
  const markets = await MandiMarket.find();
  let count = 0;

  for (const record of records) {
    const apiCropName = record.commodity || record.Commodity || '';
    const crop = findCropByAPIName(apiCropName);
    if (!crop) continue;

    const apiMarketName = record.market || record.Market || '';
    const market = findMarketByAPIName(apiMarketName, markets);
    if (!market) continue;

    const min = Number(record.min_price || record.Min_Price || 0);
    const max = Number(record.max_price || record.Max_Price || 0);
    const modal = Number(record.modal_price || record.Modal_Price || 0);
    if (!modal) continue;

    const query = { cropId: crop.id, marketId: market.marketId, variety: record.variety || 'FAQ' };
    const update = {
      cropName: crop.name,
      marketName: market.name,
      state: market.state,
      district: market.district,
      minPrice: min || Math.round(modal * 0.9),
      maxPrice: max || Math.round(modal * 1.1),
      modalPrice: modal,
      pricePerQuintal: modal,
      date: record.arrival_date || dateStr,
      time: timeStr,
      dataSource: 'data.gov.in',
      lastUpdated: new Date()
    };

    await DailyCropPrice.findOneAndUpdate(query, update, { upsert: true });
    count++;
  }

  console.log(`[PriceSync] Deployed ${count} live prices from Government API.`);
  return count > 0;
}

// Fallback high-fidelity APMC crop price simulation using seasonal indicators
async function runSeasonalPriceSimulation() {
  const currentMonth = new Date().getMonth() + 1;
  const dateStr = new Date().toLocaleDateString('en-IN');
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  let count = 0;

  const markets = await MandiMarket.find();
  for (const crop of CROPS) {
    const priceProfile = HISTORICAL_PRICES.find(h => h.cropId === crop.id);
    const baseMonthlyPrice = priceProfile 
      ? priceProfile.monthlyAvgPrices[currentMonth - 1] 
      : crop.avgMarketPrice;

    for (const market of markets) {
      const dailyNoise = 0.98 + Math.random() * 0.04;
      const modal = Math.round(baseMonthlyPrice * dailyNoise);
      const min = Math.round(modal * 0.9);
      const max = Math.round(modal * 1.1);

      const query = { cropId: crop.id, marketId: market.marketId, variety: 'FAQ' };
      const update = {
        cropName: crop.name,
        marketName: market.name,
        state: market.state,
        district: market.district,
        minPrice: min,
        maxPrice: max,
        modalPrice: modal,
        pricePerQuintal: modal,
        date: dateStr,
        time: timeStr,
        dataSource: 'AGMARKNET (Simulated)',
        lastUpdated: new Date()
      };

      await DailyCropPrice.findOneAndUpdate(query, update, { upsert: true });
      count++;
    }
  }

  console.log(`[PriceSync] Simulated seasonal update processed for ${count} crop-market pairs.`);
}

// Helpers to match commodities and markets
function findCropByAPIName(apiName) {
  const name = apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CROPS.find(c => {
    const cName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name.includes(cName) || cName.includes(name);
  });
}

function findMarketByAPIName(apiName, marketsList) {
  const name = apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return marketsList.find(m => {
    const mName = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name.includes(mName) || mName.includes(name);
  });
}
