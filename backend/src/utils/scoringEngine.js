// Agronomic and economic multi-factor scoring engine for Indian crops using ML dataset-trained coefficients
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let modelData = null;
try {
  const modelPath = path.join(__dirname, '..', 'data', 'crop_prediction_model.json');
  if (fs.existsSync(modelPath)) {
    modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    console.log('[ML] Successfully loaded crop prediction ML model weights.');
  }
} catch (err) {
  console.warn('[ML] Failed to load crop prediction ML model weights:', err.message);
}

// Predict Yield and Price using trained model coefficients
export function predictFromMLModel(target, inputs) {
  if (!modelData) {
    return null;
  }

  const intercept = modelData.intercepts[target];
  const coefficients = modelData.coefficients[target];
  
  let prediction = intercept;
  
  // Categorical encodings mapping
  const categoricals = {
    state: inputs.state,
    district: inputs.district,
    crop: inputs.crop,
    soil_type: inputs.soilType,
    water_source: inputs.waterSource
  };

  for (const [key, val] of Object.entries(categoricals)) {
    if (val) {
      const levels = modelData.mappings[key] || [];
      const matchedLevel = levels.find(l => l.toLowerCase() === String(val).toLowerCase());
      if (matchedLevel) {
        const featureName = `${key}_${matchedLevel}`;
        prediction += (coefficients[featureName] || 0);
      }
    }
  }

  // Numerical inputs weighting
  prediction += (coefficients['sowing_month'] || 0) * (inputs.sowingMonth || 6);
  prediction += (coefficients['avg_temp'] || 0) * (inputs.avgTemp || 25);
  prediction += (coefficients['rainfall'] || 0) * (inputs.rainfall || 100);

  return prediction;
}

export function scoreSeasonSuitability(crop, currentMonth) {
  if (crop.sowingMonths.includes(currentMonth)) {
    return 100;
  }
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  if (crop.sowingMonths.includes(prevMonth) || crop.sowingMonths.includes(nextMonth)) {
    return 70;
  }
  return 30;
}

export function scoreWeatherCompatibility(crop, weatherData) {
  let score = 100;
  const { avgTemp, totalRainfall } = weatherData;

  if (avgTemp < crop.tempRange.min) {
    const diff = crop.tempRange.min - avgTemp;
    score -= Math.min(diff * 10, 40);
  } else if (avgTemp > crop.tempRange.max) {
    const diff = avgTemp - crop.tempRange.max;
    score -= Math.min(diff * 8, 40);
  }

  const monthlyRainEstimate = totalRainfall * 4.3;
  if (monthlyRainEstimate < crop.rainfallRange.min) {
    const diff = crop.rainfallRange.min - monthlyRainEstimate;
    score -= Math.min(diff * 0.5, 30);
  } else if (monthlyRainEstimate > crop.rainfallRange.max) {
    const diff = monthlyRainEstimate - crop.rainfallRange.max;
    score -= Math.min(diff * 0.3, 30);
  }

  return Math.max(0, Math.round(score));
}

export function scoreSoilCompatibility(crop, soilType) {
  if (!soilType) return 70;
  const normalizedSoil = soilType.trim().toLowerCase();
  
  const matches = crop.soilTypes.some(
    s => s.toLowerCase() === normalizedSoil || 
         s.toLowerCase().includes(normalizedSoil) ||
         normalizedSoil.includes(s.toLowerCase())
  );

  return matches ? 100 : 40;
}

export function scoreProfitMargin(crop, landSizeAcres, region, harvestMonth, locationProfile, weatherData, soilType, waterSource) {
  const economics = calculateEconomics(crop, landSizeAcres, harvestMonth, null, locationProfile, weatherData, soilType, waterSource);
  const cost = economics.cultivationCost;
  const revenue = economics.expectedRevenue;
  
  if (cost === 0) return 0;
  const margin = (revenue - cost) / cost;
  
  if (margin <= 0) return 10;
  if (margin >= 1.5) return 100;
  return Math.round(10 + (margin / 1.5) * 90);
}

export function scorePriceTrend(crop, harvestMonth, historicalData) {
  if (!historicalData) return 50;
  
  const prices = historicalData.monthlyAvgPrices;
  const harvestPrice = prices[harvestMonth - 1] || crop.avgMarketPrice;
  const avgAnnual = prices.reduce((a, b) => a + b, 0) / 12;
  const diffPct = (harvestPrice - avgAnnual) / avgAnnual;

  if (diffPct > 0.15) return 100;
  if (diffPct < -0.15) return 30;
  return Math.round(50 + (diffPct / 0.15) * 30);
}

export function scoreDemandFactor(crop, harvestMonth) {
  let multiplier = 1.0;
  if ((harvestMonth === 10 || harvestMonth === 11) && crop.festivalDemand.Diwali) {
    multiplier = Math.max(multiplier, crop.festivalDemand.Diwali);
  }
  if ((harvestMonth === 3 || harvestMonth === 4) && crop.festivalDemand.Ugadi) {
    multiplier = Math.max(multiplier, crop.festivalDemand.Ugadi);
  }
  if (harvestMonth === 1 && crop.festivalDemand.Pongal) {
    multiplier = Math.max(multiplier, crop.festivalDemand.Pongal);
  }

  return Math.round(50 + (multiplier - 1) * 200);
}

export function scoreRiskAssessment(crop, weatherData) {
  let riskScore = 100;
  riskScore -= (crop.priceVolatility * 60);

  if (crop.waterRequirement === 'HIGH' && weatherData.totalRainfall < 10) {
    riskScore -= 20;
  }
  
  return Math.max(0, Math.round(riskScore));
}

export function scoreWaterMatch(crop, hasIrrigation) {
  if (hasIrrigation) return 100;
  if (crop.waterRequirement === 'LOW') return 90;
  if (crop.waterRequirement === 'MEDIUM') return 50;
  return 20;
}

export function calculateCompositeScore(scores) {
  const weights = {
    season: 0.15,
    weather: 0.15,
    soil: 0.10,
    profit: 0.20,
    price: 0.15,
    demand: 0.10,
    risk: 0.10,
    water: 0.05
  };

  let totalScore = 0;
  for (const key in weights) {
    totalScore += (scores[key] || 50) * weights[key];
  }
  return Math.round(totalScore);
}

export function generateReasons(crop, scores, weatherData, harvestMonth) {
  const reasons = [];

  if (scores.season === 100) {
    reasons.push({ type: 'POSITIVE', text: 'Currently in prime sowing window' });
  } else if (scores.season === 70) {
    reasons.push({ type: 'INFO', text: 'Sowing season ending/starting soon' });
  }

  if (scores.weather > 85) {
    reasons.push({ type: 'POSITIVE', text: 'Ideal temperature and climate conditions forecast' });
  } else if (scores.weather < 60) {
    reasons.push({ type: 'WARNING', text: 'Sub-optimal weather forecast for crop germination' });
  }

  if (scores.soil === 100) {
    reasons.push({ type: 'POSITIVE', text: `Excellent compatibility with your soil type` });
  } else {
    reasons.push({ type: 'WARNING', text: `Soil type is sub-optimal for high yields` });
  }

  if (crop.mspPerQuintal) {
    reasons.push({ type: 'POSITIVE', text: `Government MSP support floor: ₹${crop.mspPerQuintal}/quintal` });
  }
  if (scores.profit > 80) {
    reasons.push({ type: 'POSITIVE', text: 'High expected profitability margin per acre' });
  }

  if (scores.price > 80) {
    reasons.push({ type: 'POSITIVE', text: 'Prices typically reach annual peaks around harvest month' });
  }
  if (scores.demand > 70) {
    reasons.push({ type: 'POSITIVE', text: 'High seasonal/festival demand expected at harvest' });
  }

  if (crop.priceVolatility > 0.35) {
    reasons.push({ type: 'WARNING', text: 'High historical market price fluctuations' });
  }
  if (crop.storageLife < 10) {
    reasons.push({ type: 'WARNING', text: `Perishable item (max ${crop.storageLife} days storage)` });
  }

  return reasons;
}

export function calculateEconomics(crop, landSizeAcres, harvestMonth, historicalData, locationProfile, weatherData, soilType, waterSource) {
  const land = Number(landSizeAcres) || 1;
  const currentMonth = new Date().getMonth() + 1;

  // ML inputs mapping
  const mlInputs = {
    state: locationProfile?.state || 'Karnataka',
    district: locationProfile?.district || 'Haveri',
    crop: crop.name,
    soilType: soilType || 'Loamy',
    waterSource: waterSource || 'Borewell',
    sowingMonth: currentMonth,
    avgTemp: weatherData?.avgTemp || 26,
    rainfall: weatherData?.totalRainfall || 80
  };

  // Predict Yield
  let predictedYield = predictFromMLModel('yield', mlInputs);
  if (predictedYield === null || predictedYield <= 0) {
    predictedYield = (crop.yieldPerAcre.min + crop.yieldPerAcre.max) / 2;
  }
  const totalYield = predictedYield * land;

  // Predict Price
  let predictedPrice = predictFromMLModel('price', mlInputs);
  if (predictedPrice === null || predictedPrice <= 0) {
    predictedPrice = historicalData 
      ? historicalData.monthlyAvgPrices[harvestMonth - 1] 
      : crop.avgMarketPrice;
  }

  // Coconut price unit normalization scaling
  if (crop.id === 'coconut' && predictedPrice > 100) {
    predictedPrice = predictedPrice / 100;
  }

  const expectedRevenue = totalYield * predictedPrice;
  const cultivationCost = crop.costPerAcre.total * land;

  const transportCost = Math.round(totalYield * 50);
  const storageCost = crop.storageLife > 15 ? Math.round(totalYield * 25) : 0; 

  const expectedProfit = expectedRevenue - (cultivationCost + transportCost + storageCost);

  return {
    expectedYield: `${totalYield.toFixed(1)} ${crop.yieldPerAcre.unit}s`,
    expectedPrice: Math.round(predictedPrice),
    expectedRevenue: Math.round(expectedRevenue),
    cultivationCost: Math.round(cultivationCost),
    transportCost,
    storageCost,
    fertilizerCost: Math.round(crop.costPerAcre.fertilizer * land),
    labourCost: Math.round(crop.costPerAcre.labour * land),
    expectedProfit: Math.round(expectedProfit)
  };
}

export function assessRiskLevel(crop, scores) {
  const avgRiskScore = scores.risk;
  if (avgRiskScore > 75) return 'LOW';
  if (avgRiskScore > 50) return 'MEDIUM';
  return 'HIGH';
}
