// Agronomic and economic multi-factor scoring engine for Indian crops

export function scoreSeasonSuitability(crop, currentMonth) {
  // Sowing month matching
  if (crop.sowingMonths.includes(currentMonth)) {
    return 100;
  }
  // Check adjacent months
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  if (crop.sowingMonths.includes(prevMonth) || crop.sowingMonths.includes(nextMonth)) {
    return 70;
  }
  return 30; // sub-optimal but possible
}

export function scoreWeatherCompatibility(crop, weatherData) {
  // weatherData: { avgTemp, totalRainfall }
  let score = 100;
  const { avgTemp, totalRainfall } = weatherData;

  // Temperature check
  if (avgTemp < crop.tempRange.min) {
    const diff = crop.tempRange.min - avgTemp;
    score -= Math.min(diff * 10, 40); // lose up to 40 points
  } else if (avgTemp > crop.tempRange.max) {
    const diff = avgTemp - crop.tempRange.max;
    score -= Math.min(diff * 8, 40);
  }

  // Rainfall check (estimate monthly equivalents if data is short-term)
  const monthlyRainEstimate = totalRainfall * 4.3; // scale weekly to monthly approx
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
  if (!soilType) return 70; // default medium score
  const normalizedSoil = soilType.trim().toLowerCase();
  
  const matches = crop.soilTypes.some(
    s => s.toLowerCase() === normalizedSoil || 
         s.toLowerCase().includes(normalizedSoil) ||
         normalizedSoil.includes(s.toLowerCase())
  );

  return matches ? 100 : 40;
}

export function scoreProfitMargin(crop, landSizeAcres, region, harvestMonth) {
  // Expected profit percentage
  const cost = crop.costPerAcre.total * landSizeAcres;
  const yieldEst = ((crop.yieldPerAcre.min + crop.yieldPerAcre.max) / 2) * landSizeAcres;
  
  // get seasonal price factor
  const monthlyPrice = crop.monthlyPriceTrends[harvestMonth - 1] || crop.avgMarketPrice;
  const revenue = yieldEst * monthlyPrice;
  
  if (cost === 0) return 0;
  const margin = (revenue - cost) / cost;
  
  // Score margin from 0 to 150%
  if (margin <= 0) return 10;
  if (margin >= 1.5) return 100;
  return Math.round(10 + (margin / 1.5) * 90);
}

export function scorePriceTrend(crop, harvestMonth, historicalData) {
  if (!historicalData) return 50;
  
  const prices = historicalData.monthlyAvgPrices;
  const harvestPrice = prices[harvestMonth - 1] || crop.avgMarketPrice;
  
  // Compare to annual average
  const avgAnnual = prices.reduce((a, b) => a + b, 0) / 12;
  const diffPct = (harvestPrice - avgAnnual) / avgAnnual;

  if (diffPct > 0.15) return 100; // Peak price period
  if (diffPct < -0.15) return 30; // Lowest price period
  return Math.round(50 + (diffPct / 0.15) * 30);
}

export function scoreDemandFactor(crop, harvestMonth) {
  // Peak festival demands
  // Diwali (~Oct/Nov = months 10,11), Ugadi (~Mar/Apr = months 3,4), Pongal (~Jan = month 1)
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

  return Math.round(50 + (multiplier - 1) * 200); // map 1.0->50, 1.25->100
}

export function scoreRiskAssessment(crop, weatherData) {
  // Volatility and water sensitivity
  let riskScore = 100;
  
  // Deduct based on market volatility
  riskScore -= (crop.priceVolatility * 60);

  // Deduct if high water requirement and forecast is dry
  if (crop.waterRequirement === 'HIGH' && weatherData.totalRainfall < 10) {
    riskScore -= 20;
  }
  
  return Math.max(0, Math.round(riskScore));
}

export function scoreWaterMatch(crop, hasIrrigation) {
  if (hasIrrigation) return 100;
  // If dry-land farming, score based on low water requirements
  if (crop.waterRequirement === 'LOW') return 90;
  if (crop.waterRequirement === 'MEDIUM') return 50;
  return 20; // High water requirement with no irrigation = very bad fit
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

  // Season
  if (scores.season === 100) {
    reasons.push({ type: 'POSITIVE', text: 'Currently in prime sowing window' });
  } else if (scores.season === 70) {
    reasons.push({ type: 'INFO', text: 'Sowing season ending/starting soon' });
  }

  // Weather
  if (scores.weather > 85) {
    reasons.push({ type: 'POSITIVE', text: 'Ideal temperature and climate conditions forecast' });
  } else if (scores.weather < 60) {
    reasons.push({ type: 'WARNING', text: 'Sub-optimal weather forecast for crop germination' });
  }

  // Soil
  if (scores.soil === 100) {
    reasons.push({ type: 'POSITIVE', text: `Excellent compatibility with your soil type` });
  } else {
    reasons.push({ type: 'WARNING', text: `Soil type is sub-optimal for high yields` });
  }

  // Profit / MSP
  if (crop.mspPerQuintal) {
    reasons.push({ type: 'POSITIVE', text: `Government MSP support floor: ₹${crop.mspPerQuintal}/quintal` });
  }
  if (scores.profit > 80) {
    reasons.push({ type: 'POSITIVE', text: 'High expected profitability margin per acre' });
  }

  // Price Trend & Demand
  if (scores.price > 80) {
    reasons.push({ type: 'POSITIVE', text: 'Prices typically reach annual peaks around harvest month' });
  }
  if (scores.demand > 70) {
    reasons.push({ type: 'POSITIVE', text: 'High seasonal/festival demand expected at harvest' });
  }

  // Risk
  if (crop.priceVolatility > 0.35) {
    reasons.push({ type: 'WARNING', text: 'High historical market price fluctuations' });
  }
  if (crop.storageLife < 10) {
    reasons.push({ type: 'WARNING', text: `Perishable item (max ${crop.storageLife} days storage)` });
  }

  return reasons;
}

export function calculateEconomics(crop, landSizeAcres, harvestMonth, historicalData) {
  const yields = (crop.yieldPerAcre.min + crop.yieldPerAcre.max) / 2;
  const totalYield = yields * landSizeAcres;
  
  const estimatedPrice = historicalData 
    ? historicalData.monthlyAvgPrices[harvestMonth - 1] 
    : crop.avgMarketPrice;

  const expectedRevenue = totalYield * estimatedPrice;
  const cultivationCost = crop.costPerAcre.total * landSizeAcres;

  // Estimated auxiliary costs
  const transportCost = Math.round(totalYield * 50); // ₹50 per quintal transport approx
  const storageCost = crop.storageLife > 15 ? Math.round(totalYield * 25) : 0; 

  const expectedProfit = expectedRevenue - (cultivationCost + transportCost + storageCost);

  return {
    expectedYield: `${totalYield.toFixed(1)} ${crop.yieldPerAcre.unit}s`,
    expectedPrice: Math.round(estimatedPrice),
    expectedRevenue: Math.round(expectedRevenue),
    cultivationCost: Math.round(cultivationCost),
    transportCost,
    storageCost,
    fertilizerCost: Math.round(crop.costPerAcre.fertilizer * landSizeAcres),
    labourCost: Math.round(crop.costPerAcre.labour * landSizeAcres),
    expectedProfit: Math.round(expectedProfit)
  };
}

export function assessRiskLevel(crop, scores) {
  const avgRiskScore = scores.risk;
  if (avgRiskScore > 75) return 'LOW';
  if (avgRiskScore > 50) return 'MEDIUM';
  return 'HIGH';
}
