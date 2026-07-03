import { CROPS } from '../data/cropDatabase.js';
import { MARKETS } from '../data/marketDatabase.js';
import { HISTORICAL_PRICES } from '../data/historicalPrices.js';
import { DailyCropPrice, User } from '../models/index.js';
import { syncDailyPrices } from '../services/priceSyncService.js';
import { resolvePincode } from '../data/locationDatabase.js';
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

// Priority location resolution engine (GPS -> Profile -> Form Dropdowns -> PIN Code -> IP Fallback)
async function resolveLocationContext(req, body) {
  let resolved = {
    lat: null,
    lon: null,
    state: '',
    district: '',
    taluk: '',
    village: '',
    pincode: '',
    source: ''
  };

  // 1. GPS Location coordinates
  if (body.lat && body.lon) {
    resolved.lat = Number(body.lat);
    resolved.lon = Number(body.lon);
    resolved.source = 'GPS';

    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${resolved.lat}&lon=${resolved.lon}&format=json&accept-language=en`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const data = await geoRes.json();
        const address = data.address || {};
        resolved.state = address.state || '';
        resolved.district = address.district || address.county || address.state_district || '';
        resolved.taluk = address.suburb || address.town || address.county || '';
        resolved.village = address.village || address.hamlet || address.neighbourhood || '';
        resolved.pincode = address.postcode || '';
      }
    } catch (e) {
      console.warn('[Location] GPS reverse lookup failed:', e.message);
    }
  }

  // 2. Saved user profile location
  if (!resolved.state && req.user?.userId) {
    try {
      const userProfile = await User.findById(req.user.userId);
      if (userProfile && userProfile.state) {
        resolved.state = userProfile.state;
        resolved.district = userProfile.district || '';
        resolved.taluk = userProfile.taluk || '';
        resolved.village = userProfile.village || '';
        resolved.source = 'Profile';
      }
    } catch (profileErr) {
      console.warn('[Location] Profile read failed:', profileErr.message);
    }
  }

  // 3. User Selection chain
  if (!resolved.state && body.state) {
    resolved.state = body.state;
    resolved.district = body.district || '';
    resolved.taluk = body.taluk || '';
    resolved.village = body.village || '';
    resolved.pincode = body.pincode || '';
    resolved.source = 'Dropdown Selections';
  }

  // 4. PIN Code lookup
  if (!resolved.state && body.pincode) {
    const pinResolved = resolvePincode(body.pincode);
    if (pinResolved) {
      resolved.state = pinResolved.state;
      resolved.district = pinResolved.district;
      resolved.taluk = pinResolved.taluk;
      resolved.village = pinResolved.village;
      resolved.pincode = body.pincode;
      resolved.source = 'PIN Local Directory';
    } else {
      try {
        const pinRes = await fetch(`https://api.postalpincode.in/pincode/${body.pincode}`);
        if (pinRes.ok) {
          const json = await pinRes.json();
          if (json[0]?.Status === 'Success' && json[0].PostOffice?.length > 0) {
            const po = json[0].PostOffice[0];
            resolved.state = po.State;
            resolved.district = po.District;
            resolved.taluk = po.Block || po.Taluk || po.Division;
            resolved.village = po.Name;
            resolved.pincode = body.pincode;
            resolved.source = 'PIN Postal API';
          }
        }
      } catch (pinErr) {
        console.warn('[Location] Postal PIN lookup API failed:', pinErr.message);
      }
    }
  }

  // 5. IP-based fallback
  if (!resolved.state || !resolved.lat) {
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData && !ipData.error) {
          if (!resolved.lat) {
            resolved.lat = Number(ipData.latitude);
            resolved.lon = Number(ipData.longitude);
          }
          if (!resolved.state) {
            resolved.state = ipData.region || '';
            resolved.district = ipData.city || '';
            resolved.source = 'IP Lookup';
          }
        }
      }
    } catch (ipErr) {
      console.warn('[Location] IP lookup fallback failed:', ipErr.message);
    }
  }

  // 6. Dynamic district centroid coordinate resolver if lat/lon is still missing
  if ((resolved.state || resolved.district) && (!resolved.lat || !resolved.lon)) {
    try {
      const searchQuery = encodeURIComponent(`${resolved.district || ''}, ${resolved.state || ''}, India`);
      const searchUrl = `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=1`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData && searchData[0]) {
          resolved.lat = Number(searchData[0].lat);
          resolved.lon = Number(searchData[0].lon);
          resolved.source = 'Nominatim District Search';
        }
      }
    } catch (searchErr) {
      console.warn('[Location] Nominatim search failed:', searchErr.message);
    }
  }

  // Default fallback coords (Bangalore, Karnataka)
  if (!resolved.lat || !resolved.lon) {
    resolved.lat = 12.9716;
    resolved.lon = 77.5946;
  }

  return resolved;
}

export const analyze = async (req, res) => {
  try {
    const {
      landSize = 1,
      soilType,
      irrigationAvailable = false,
      waterSource,
      farmingType,
      searchOutsideArea = false
    } = req.body;

    const land = Number(landSize) || 1;

    // 1. Resolve Location using chain of priorities
    const locationProfile = await resolveLocationContext(req, req.body);

    // Trigger daily price sync check
    await syncDailyPrices();

    // 2. Fetch 7-day forecast from Open-Meteo
    let weatherSummary = { ...DEFAULT_WEATHER };
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${locationProfile.lat}&longitude=${locationProfile.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
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
      console.warn('[Weather] Fetch failed, using climatology fallbacks:', weatherErr.message);
    }

    const currentMonth = new Date().getMonth() + 1; // 1-12

    // 3. Filter markets - prevent recommending distant mandis unless explicitly allowed
    const outsideSearch = searchOutsideArea === true || searchOutsideArea === 'true';
    let filteredMarkets = MARKETS;
    
    if (!outsideSearch && locationProfile.state && locationProfile.district) {
      filteredMarkets = MARKETS.filter(m => 
        m.state.toLowerCase() === locationProfile.state.toLowerCase() &&
        m.district.toLowerCase() === locationProfile.district.toLowerCase()
      );
      // Fallback to state level if no APMCs are in the district
      if (filteredMarkets.length === 0) {
        filteredMarkets = MARKETS.filter(m => 
          m.state.toLowerCase() === locationProfile.state.toLowerCase()
        );
      }
    }
    
    if (filteredMarkets.length === 0) {
      filteredMarkets = MARKETS;
    }

    // 4. Run Recommendation calculations
    const recommendations = [];

    for (const crop of CROPS) {
      const durationDays = crop.durationDays;
      const harvestDate = new Date();
      harvestDate.setDate(harvestDate.getDate() + durationDays);
      const harvestMonth = harvestDate.getMonth() + 1;

      const historicalData = HISTORICAL_PRICES.find(h => h.cropId === crop.id);
      
      // Query live daily price entry for this crop
      const dailyPrices = await DailyCropPrice.find({ cropId: crop.id });
      const currentAvgLivePrice = dailyPrices.length > 0
        ? dailyPrices.reduce((a, b) => a + b.pricePerQuintal, 0) / dailyPrices.length
        : (historicalData ? historicalData.monthlyAvgPrices[currentMonth - 1] : crop.avgMarketPrice);

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

      // Map to filtered APMC markets
      const nearbyMarkets = filteredMarkets.map(market => {
        const distance = getDistance(locationProfile.lat, locationProfile.lon, market.lat, market.lon);
        const unitTransportCost = 20 + distance * 4;
        const totalTransportCost = Math.round(((crop.yieldPerAcre.min + crop.yieldPerAcre.max) / 2) * land * (unitTransportCost / 10));

        const liveMarketEntry = dailyPrices.find(p => p.marketId === market.id);
        const currentPrice = liveMarketEntry ? liveMarketEntry.pricePerQuintal : crop.avgMarketPrice;

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
          transportCost: totalTransportCost,
          arrivalQuantity: liveMarketEntry?.arrivalQuantity || 120 + Math.round(Math.random() * 80), // tonnes
          marketTrend: trendMultiplier > 1.05 ? 'Increasing' : trendMultiplier < 0.95 ? 'Decreasing' : 'Stable',
          bestSellingWindow: harvestMonth === 10 || harvestMonth === 11 ? 'Late October (Diwali Festival)' : 'Mid month (Stable volume)'
        };
      })
      .sort((a, b) => a.distance - b.distance); // sort nearest to farthest

      const recommendedMarket = nearbyMarkets[0] || { name: 'Local Mandi', distance: 0, currentPrice: currentAvgLivePrice, predictedPrice: currentAvgLivePrice };

      // Math updates for predictions
      const profitPercentage = Math.round((economics.expectedProfit / economics.cultivationCost) * 100);

      recommendations.push({
        crop,
        score: compositeScore,
        confidence: Math.round(compositeScore),
        risk,
        harvestDate: harvestDate.toISOString().slice(0, 10),
        daysUntilHarvest: durationDays,
        economics: {
          ...economics,
          profitPercentage
        },
        reasons,
        nearbyMarkets: nearbyMarkets.slice(0, 5), // top 5
        recommendedMarket: recommendedMarket.name,
        distanceToMarket: recommendedMarket.distance,
        priceTrend: liveHistoricalData ? liveHistoricalData.monthlyAvgPrices : crop.monthlyPriceTrends
      });
    }

    // Sort by expected net profit descending
    recommendations.sort((a, b) => b.economics.expectedProfit - a.economics.expectedProfit);

    // Limit to top 10 recommended crops
    const top10 = recommendations.slice(0, 10).map((rec, index) => ({
      rank: index + 1,
      ...rec
    }));

    res.json({
      success: true,
      data: {
        farmerProfile: locationProfile,
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

    const crop = CROPS.find(c => c.id === cropId);
    const market = MARKETS.find(m => m.id === marketId);
    if (!crop || !market) {
      return res.status(400).json({ success: false, message: 'Invalid crop or market ID.' });
    }

    const dateStr = new Date().toLocaleDateString('en-IN');
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const entry = await DailyCropPrice.findOneAndUpdate(
      { cropId, marketId, variety: 'FAQ' },
      {
        cropName: crop.name,
        marketName: market.name,
        state: market.state,
        district: market.district,
        minPrice: Math.round(pricePerQuintal * 0.9),
        maxPrice: Math.round(pricePerQuintal * 1.1),
        modalPrice: Number(pricePerQuintal),
        pricePerQuintal: Number(pricePerQuintal),
        date: dateStr,
        time: timeStr,
        dataSource: 'Admin Manual Override',
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Market price updated successfully', data: entry });
  } catch (error) {
    console.error('Error updating market price manually:', error);
    res.status(500).json({ success: false, message: 'Failed to update market price.' });
  }
};
