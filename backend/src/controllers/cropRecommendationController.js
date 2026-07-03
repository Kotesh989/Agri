import { CROPS } from '../data/cropDatabase.js';
import { HISTORICAL_PRICES } from '../data/historicalPrices.js';
import { DailyCropPrice, User, MandiMarket } from '../models/index.js';
import { syncDailyPrices } from '../services/priceSyncService.js';
import { resolvePincode } from '../data/locationDatabase.js';
import { resolveOrSeedLocationContext } from '../services/locationService.js';
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

  // Cache/persist resolved details dynamically as LocationNodes in MongoDB
  if (resolved.state) {
    await resolveOrSeedLocationContext(
      resolved.state, 
      resolved.district, 
      resolved.taluk, 
      resolved.village, 
      resolved.pincode
    ).catch(err => console.warn('[Location] Failed to cache location nodes:', err.message));
  }

  return resolved;
}

// Hierarchical crop pricing fallback calculator
async function getHierarchicalFallbackPrice(crop, locationProfile, currentMonth, harvestMonth, historicalData) {
  const cropId = crop.id;
  let matchedPrice = null;
  let sourceLevel = 'National Average';
  let confidenceScore = 40;

  // 1. Village Level Check
  if (locationProfile.village) {
    const match = await DailyCropPrice.findOne({ cropId, marketName: { $regex: new RegExp(`^${locationProfile.village}$`, 'i') } });
    if (match) {
      matchedPrice = match.pricePerQuintal;
      sourceLevel = 'Village Mandi';
      confidenceScore = 95;
    }
  }

  // 2. Taluk Level Check
  if (!matchedPrice && locationProfile.taluk) {
    const matches = await DailyCropPrice.find({ cropId, marketName: { $regex: new RegExp(`${locationProfile.taluk}`, 'i') } });
    if (matches.length > 0) {
      matchedPrice = matches.reduce((a, b) => a + b.pricePerQuintal, 0) / matches.length;
      sourceLevel = 'Taluk Average';
      confidenceScore = 85;
    }
  }

  // 3. District Level Check
  if (!matchedPrice && locationProfile.district) {
    const matches = await DailyCropPrice.find({ cropId, district: { $regex: new RegExp(`^${locationProfile.district}$`, 'i') } });
    if (matches.length > 0) {
      matchedPrice = matches.reduce((a, b) => a + b.pricePerQuintal, 0) / matches.length;
      sourceLevel = 'District Average';
      confidenceScore = 75;
    }
  }

  // 4. State Level Check
  if (!matchedPrice && locationProfile.state) {
    const matches = await DailyCropPrice.find({ cropId, state: { $regex: new RegExp(`^${locationProfile.state}$`, 'i') } });
    if (matches.length > 0) {
      matchedPrice = matches.reduce((a, b) => a + b.pricePerQuintal, 0) / matches.length;
      sourceLevel = 'State Average';
      confidenceScore = 60;
    }
  }

  // 5. National/General Database Average
  if (!matchedPrice) {
    const matches = await DailyCropPrice.find({ cropId });
    if (matches.length > 0) {
      matchedPrice = matches.reduce((a, b) => a + b.pricePerQuintal, 0) / matches.length;
      sourceLevel = 'National Average';
      confidenceScore = 50;
    }
  }

  // 6. Historical crop config profile fallback
  if (!matchedPrice) {
    matchedPrice = historicalData 
      ? historicalData.monthlyAvgPrices[currentMonth - 1] 
      : crop.avgMarketPrice;
    sourceLevel = 'Historical Base Profile';
    confidenceScore = 45;
  }

  // Seasonality multiplier projection
  const currentMonthAvg = historicalData ? historicalData.monthlyAvgPrices[currentMonth - 1] : crop.avgMarketPrice;
  const harvestMonthAvg = historicalData ? historicalData.monthlyAvgPrices[harvestMonth - 1] : crop.avgMarketPrice;
  const trendMultiplier = currentMonthAvg > 0 ? (harvestMonthAvg / currentMonthAvg) : 1.0;
  const predictedPrice = Math.round(matchedPrice * trendMultiplier);

  return {
    currentPrice: Math.round(matchedPrice),
    predictedPrice,
    sourceLevel,
    confidenceScore
  };
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

    // 1. Resolve Location Node details
    const locationProfile = await resolveLocationContext(req, req.body);

    // Dynamic price sync
    await syncDailyPrices();

    // 2. Open-Meteo Weather forecast parameters
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
      console.warn('[Weather] Fetch failed, using default averages:', weatherErr.message);
    }

    const currentMonth = new Date().getMonth() + 1;

    // 3. Retrieve MandiMarkets from MongoDB (prevent recommending distant states)
    const outsideSearch = searchOutsideArea === true || searchOutsideArea === 'true';

    // Seed district-level mandis dynamically if none exist in the database for the user's district
    if (locationProfile.district && locationProfile.state) {
      const count = await MandiMarket.countDocuments({
        district: { $regex: new RegExp(`^${locationProfile.district}$`, 'i') },
        state: { $regex: new RegExp(`^${locationProfile.state}$`, 'i') }
      });
      if (count === 0) {
        console.log(`[Location] Generating dynamic local markets for: ${locationProfile.district}`);
        const baseLat = locationProfile.lat || 12.9716;
        const baseLon = locationProfile.lon || 77.5946;
        const dynamicMandis = [
          {
            marketId: `${locationProfile.district.toLowerCase()}_apmc_main`,
            name: `${locationProfile.district} APMC (Main Yard)`,
            state: locationProfile.state,
            district: locationProfile.district,
            lat: baseLat + 0.03,
            lon: baseLon - 0.02
          },
          {
            marketId: `${locationProfile.district.toLowerCase()}_apmc_town`,
            name: `${locationProfile.district} Town Market`,
            state: locationProfile.state,
            district: locationProfile.district,
            lat: baseLat - 0.04,
            lon: baseLon + 0.03
          }
        ];
        await MandiMarket.insertMany(dynamicMandis, { ordered: false }).catch(() => {});
      }
    }

    let filteredMarkets = [];

    if (!outsideSearch && locationProfile.state) {
      filteredMarkets = await MandiMarket.find({ state: { $regex: new RegExp(`^${locationProfile.state}$`, 'i') } });
    }
    
    if (filteredMarkets.length === 0) {
      filteredMarkets = await MandiMarket.find();
    }

    // 4. Recommendation looping
    const recommendations = [];

    for (const crop of CROPS) {
      const durationDays = crop.durationDays;
      const harvestDate = new Date();
      harvestDate.setDate(harvestDate.getDate() + durationDays);
      const harvestMonth = harvestDate.getMonth() + 1;

      const historicalData = HISTORICAL_PRICES.find(h => h.cropId === crop.id);

      // Hierarchical price matching
      const priceContext = await getHierarchicalEstimatedPriceFallback(crop, locationProfile, currentMonth, harvestMonth, historicalData);

      // Scoring
      const scores = {
        season: scoreSeasonSuitability(crop, currentMonth),
        weather: scoreWeatherCompatibility(crop, weatherSummary),
        soil: scoreSoilCompatibility(crop, soilType),
        profit: scoreProfitMargin(crop, land, 'Karnataka', harvestMonth),
        price: scorePriceTrend(crop, harvestMonth, historicalData),
        demand: scoreDemandFactor(crop, harvestMonth),
        risk: scoreRiskAssessment(crop, weatherSummary),
        water: scoreWaterMatch(crop, irrigationAvailable)
      };

      const compositeScore = calculateCompositeScore(scores);
      
      // Inject fallback pricing to economics scoring
      const mockHistoricalData = historicalData ? {
        ...historicalData,
        monthlyAvgPrices: historicalData.monthlyAvgPrices.map((p, idx) => 
          idx === (currentMonth - 1) ? priceContext.currentPrice : p
        )
      } : null;

      const economics = calculateEconomics(crop, land, harvestMonth, mockHistoricalData);
      const risk = assessRiskLevel(crop, scores);
      const reasons = generateReasons(crop, scores, weatherSummary, harvestMonth);

      // Distances sorting
      const nearbyMarkets = filteredMarkets.map(market => {
        const distance = getDistance(locationProfile.lat, locationProfile.lon, market.lat, market.lon);
        const unitTransportCost = 20 + distance * 4;
        const totalTransportCost = Math.round(((crop.yieldPerAcre.min + crop.yieldPerAcre.max) / 2) * land * (unitTransportCost / 10));

        return {
          id: market.marketId,
          name: market.name,
          distance,
          currentPrice: priceContext.currentPrice,
          predictedPrice: priceContext.predictedPrice,
          transportCost: totalTransportCost,
          arrivalQuantity: 120 + Math.round(Math.random() * 80),
          marketTrend: priceContext.predictedPrice > priceContext.currentPrice ? 'Increasing' : 'Stable',
          bestSellingWindow: 'Harvest Mid Month'
        };
      })
      .sort((a, b) => a.distance - b.distance);

      const recommendedMarket = nearbyMarkets[0] || { name: 'Local Mandi', distance: 0 };
      const profitPercentage = Math.round((economics.expectedProfit / economics.cultivationCost) * 100);

      recommendations.push({
        crop,
        score: compositeScore,
        confidence: priceContext.confidenceScore,
        risk,
        harvestDate: harvestDate.toISOString().slice(0, 10),
        daysUntilHarvest: durationDays,
        economics: {
          ...economics,
          profitPercentage
        },
        reasons,
        nearbyMarkets: nearbyMarkets.slice(0, 5),
        recommendedMarket: recommendedMarket.name,
        distanceToMarket: recommendedMarket.distance,
        priceTrend: mockHistoricalData ? mockHistoricalData.monthlyAvgPrices : crop.monthlyPriceTrends
      });
    }

    recommendations.sort((a, b) => b.economics.expectedProfit - a.economics.expectedProfit);
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

// Internal router link mapping helper
async function getHierarchicalEstimatedPriceFallback(crop, locationProfile, currentMonth, harvestMonth, historicalData) {
  try {
    return await getHierarchicalFallbackPrice(crop, locationProfile, currentMonth, harvestMonth, historicalData);
  } catch (err) {
    console.warn('[Pricing] Fallback failed, returning base default:', err.message);
    return {
      currentPrice: crop.avgMarketPrice,
      predictedPrice: crop.avgMarketPrice,
      sourceLevel: 'National Average Fallback',
      confidenceScore: 40
    };
  }
}

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

    const markets = await MandiMarket.find();
    const sorted = markets.map(m => ({
      id: m.marketId,
      name: m.name,
      state: m.state,
      district: m.district,
      lat: m.lat,
      lon: m.lon,
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

// Admin manually updates mandi prices
export const updateMarketPrice = async (req, res) => {
  try {
    const { cropId, marketId, pricePerQuintal } = req.body;
    if (!cropId || !marketId || !pricePerQuintal || Number(pricePerQuintal) <= 0) {
      return res.status(400).json({ success: false, message: 'Crop ID, Market ID, and positive price are required.' });
    }

    const crop = CROPS.find(c => c.id === cropId);
    const market = await MandiMarket.findOne({ marketId });
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
