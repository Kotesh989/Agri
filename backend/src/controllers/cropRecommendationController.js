import { CROPS } from '../data/cropDatabase.js';
import { MARKETS } from '../data/marketDatabase.js';
import { HISTORICAL_PRICES } from '../data/historicalPrices.js';
import { DailyCropPrice } from '../models/index.js';
import { syncDailyPrices } from '../services/priceSyncService.js';
import {
  scoreSeasonSuitability,
  scoreWeatherCompatibility,
  scoreSoilCompatibility,
  scoreProfitMargin,
  scorePriceTrend,
  scoreDemandFactor,
  scoreRiskAssessment,
  scoreWaterMatch,
  calculateCompositeScore,
  generateReasons,
  calculateEconomics,
  assessRiskLevel
} from '../utils/scoringEngine.js';

// Calculate distance in km using Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Fallback weather data if fetch fails
const DEFAULT_WEATHER = {
  avgTemp: 26,
  totalRainfall: 80,
  avgHumidity: 65
};

export const analyze = async (req, res) => {
  try {
    const {
      lat,
      lon,
      landSize = 1,
      soilType,
      irrigationAvailable = false,
      waterSource,
      farmingType
    } = req.body;

    const land = Number(landSize) || 1;
    const farmerLat = Number(lat) || 12.9716; // default Bangalore
    const farmerLon = Number(lon) || 77.5946;

    // Trigger daily price sync to ensure database is populated
    await syncDailyPrices();

    // 1. Fetch 7-day forecast from Open-Meteo
    let weatherSummary = { ...DEFAULT_WEATHER };
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${farmerLat}&longitude=${farmerLon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      if (weatherRes.ok) {
        const weatherJson = await weatherRes.json();
        const temps = [
          ...(weatherJson.daily?.temperature_2m_max || []),
          ...(weatherJson.daily?.temperature_2m_min || [])
        ];
        const rainSum = (weatherJson.daily?.precipitation_sum || []).reduce((a, b) => a + b, 0);
        
        if (temps.length > 0) {
          const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
          weatherSummary = {
            avgTemp: Math.round(avgTemp),
            totalRainfall: Math.round(rainSum),
            avgHumidity: 65
          };
        }
      }
    } catch (weatherErr) {
      console.warn('Failed to fetch weather forecast, using default climatology:', weatherErr.message);
    }

    const currentMonth = new Date().getMonth() + 1; // 1-12

    // 2. Score crops
    const recommendations = [];

    for (const crop of CROPS) {
      const durationDays = crop.durationDays;
      const harvestDate = new Date();
      harvestDate.setDate(harvestDate.getDate() + durationDays);
      const harvestMonth = harvestDate.getMonth() + 1;

      const historicalData = HISTORICAL_PRICES.find(h => h.cropId === crop.id);
      
      // Query live daily price entry for this crop to inject real-time values
      const dailyPrices = await DailyCropPrice.find({ cropId: crop.id });
      const currentAvgLivePrice = dailyPrices.length > 0
        ? dailyPrices.reduce((a, b) => a + b.pricePerQuintal, 0) / dailyPrices.length
        : (historicalData ? historicalData.monthlyAvgPrices[currentMonth - 1] : crop.avgMarketPrice);

      // Create a dynamic historical data profile with live price injected
      const liveHistoricalData = historicalData ? {
        ...historicalData,
        monthlyAvgPrices: historicalData.monthlyAvgPrices.map((p, idx) => 
          idx === (currentMonth - 1) ? Math.round(currentAvgLivePrice) : p
        )
      } : null;

      // Scoring breakdown
      const scores = {
        season: scoreSeasonSuitability(crop, currentMonth),
        weather: scoreWeatherCompatibility(crop, weatherSummary),
        soil: scoreSoilCompatibility(crop, soilType),
        profit: scoreProfitMargin(crop, land, 'Karnataka', harvestMonth),
        price: scorePriceTrend(crop, harvestMonth, liveHistoricalData),
        demand: scoreDemandFactor(crop, harvestMonth),
        risk: scoreRiskAssessment(crop, weatherSummary),
        water: scoreWaterMatch(crop, irrigationAvailable)
      };

      const compositeScore = calculateCompositeScore(scores);
      const economics = calculateEconomics(crop, land, harvestMonth, liveHistoricalData);
      const risk = assessRiskLevel(crop, scores);
      const reasons = generateReasons(crop, scores, weatherSummary, harvestMonth);

      // 3. Find nearby markets & calculate transport costs
      const nearbyMarkets = MARKETS.map(market => {
        const distance = getDistance(farmerLat, farmerLon, market.lat, market.lon);
        // Estimate transport cost: ₹20 base + ₹4 per km per quintal approx
        const unitTransportCost = 20 + distance * 4;
        const totalTransportCost = Math.round(((crop.yieldPerAcre.min + crop.yieldPerAcre.max) / 2) * land * (unitTransportCost / 10));

        // Find live today's price in this specific market
        const liveMarketEntry = dailyPrices.find(p => p.marketId === market.id);
        const currentPrice = liveMarketEntry ? liveMarketEntry.pricePerQuintal : crop.avgMarketPrice;

        // Predict future harvest price based on seasonal trend factor
        const currentMonthAvg = historicalData ? historicalData.monthlyAvgPrices[currentMonth - 1] : crop.avgMarketPrice;
        const harvestMonthAvg = historicalData ? historicalData.monthlyAvgPrices[harvestMonth - 1] : crop.avgMarketPrice;
        const trendMultiplier = currentMonthAvg > 0 ? (harvestMonthAvg / currentMonthAvg) : 1.0;
        const predictedPrice = Math.round(currentPrice * trendMultiplier);

        return {
          id: market.id,
          name: market.name,
          distance,
          currentPrice,
          predictedPrice,
          transportCost: totalTransportCost
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5); // top 5 closest markets

      recommendations.push({
        crop,
        score: compositeScore,
        confidence: Math.round(compositeScore),
        risk,
        harvestDate: harvestDate.toISOString().slice(0, 10),
        economics,
        reasons,
        nearbyMarkets,
        priceTrend: liveHistoricalData ? liveHistoricalData.monthlyAvgPrices : crop.monthlyPriceTrends
      });
    }

    // 4. Sort recommendations by score descending
    recommendations.sort((a, b) => b.score - a.score);

    // Limit to top 10 recommended crops
    const top10 = recommendations.slice(0, 10).map((rec, index) => ({
      rank: index + 1,
      ...rec
    }));

    res.json({
      success: true,
      data: {
        farmerProfile: {
          state: req.body.state,
          district: req.body.district,
          taluk: req.body.taluk,
          village: req.body.village,
          landSize: land,
          soilType,
          irrigationAvailable,
          waterSource,
          farmingType
        },
        weatherSummary,
        recommendations: top10,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Crop Recommendation analysis error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listCrops = async (req, res) => {
  try {
    res.json({ success: true, data: CROPS });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list crops' });
  }
};

export const listMarkets = async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 12.9716;
    const lon = Number(req.query.lon) || 77.5946;
    const limit = Number(req.query.limit) || 10;

    const sorted = MARKETS.map(m => ({
      ...m,
      distance: getDistance(lat, lon, m.lat, m.lon)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

    res.json({ success: true, data: sorted });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list markets' });
  }
};

export const priceHistory = async (req, res) => {
  try {
    const { cropId } = req.params;
    
    // Attempt to merge live price from YESHWANTHPUR as the current month baseline
    const history = HISTORICAL_PRICES.find(h => h.cropId === cropId);
    if (!history) {
      return res.status(404).json({ success: false, message: 'Crop history not found' });
    }

    const currentMonth = new Date().getMonth() + 1;
    const liveEntries = await DailyCropPrice.find({ cropId });
    if (liveEntries.length > 0) {
      const avgLive = liveEntries.reduce((a, b) => a + b.pricePerQuintal, 0) / liveEntries.length;
      const prices = [...history.monthlyAvgPrices];
      prices[currentMonth - 1] = Math.round(avgLive);
      
      return res.json({
        success: true,
        data: {
          ...history,
          monthlyAvgPrices: prices
        }
      });
    }

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get price history' });
  }
};

export const weatherAnalysis = async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 12.9716;
    const lon = Number(req.query.lon) || 77.5946;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    
    if (!weatherRes.ok) {
      return res.status(500).json({ success: false, message: 'Failed to fetch weather from external service' });
    }

    const json = await weatherRes.json();
    res.json({ success: true, data: json });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Weather analysis error' });
  }
};

// Admin endpoint to manually update today's APMC mandi market price for a crop
export const updateMarketPrice = async (req, res) => {
  try {
    const { cropId, marketId, pricePerQuintal } = req.body;
    if (!cropId || !marketId || !pricePerQuintal || Number(pricePerQuintal) <= 0) {
      return res.status(400).json({ success: false, message: 'Crop ID, Market ID, and positive price are required.' });
    }

    const entry = await DailyCropPrice.findOneAndUpdate(
      { cropId, marketId },
      { pricePerQuintal: Number(pricePerQuintal), lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Market price updated successfully', data: entry });
  } catch (error) {
    console.error('Error updating market price manually:', error);
    res.status(500).json({ success: false, message: 'Failed to update market price.' });
  }
};
