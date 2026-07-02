import { getOwnerFilter } from '../utils/ownership.js';

export const getWeatherAdvisory = async (req, res) => {
  try {
    const lat = Number(req.query.lat || 12.9716); // Default to Bangalore lat
    const lon = Number(req.query.lon || 77.5946); // Default to Bangalore lon

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&current_weather=true&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }
    const data = await response.json();

    const daily = data.daily || {};
    const advisories = [];
    let bestWindow = null;

    if (daily.time) {
      for (let index = 0; index < daily.time.length; index += 1) {
        const date = daily.time[index];
        const tempMax = daily.temperature_2m_max[index];
        const tempMin = daily.temperature_2m_min[index];
        const rain = daily.precipitation_sum[index];
        const wind = daily.windspeed_10m_max[index];

        const alerts = [];
        let isSafeForFertilizer = true;
        let isSafeForPesticide = true;

        if (rain > 10) {
          alerts.push('Heavy rainfall expected. Runoff risk.');
          isSafeForFertilizer = false;
        } else if (rain > 5) {
          alerts.push('Moderate rain expected. Applying fertilizer now might reduce efficiency.');
          isSafeForFertilizer = false;
        }

        if (wind > 15) {
          alerts.push('High wind speed. Extreme pesticide drift hazard.');
          isSafeForPesticide = false;
        } else if (wind > 12) {
          alerts.push('Moderate wind speed. Spray pesticides with caution.');
          isSafeForPesticide = false;
        }

        if (tempMax > 40) {
          alerts.push('Extreme high temperature. High evaporation rate.');
          isSafeForFertilizer = false;
        }

        if (tempMin < 2) {
          alerts.push('Frost alert. Crops may experience thermal shock.');
        }

        let recommendation = 'Safe to apply fertilizers and pesticides.';
        if (!isSafeForFertilizer && !isSafeForPesticide) {
          recommendation = 'Avoid both fertilizer and pesticide applications today due to adverse conditions.';
        } else if (!isSafeForFertilizer) {
          recommendation = 'Avoid fertilizer application due to rain/heat. Pesticide application is acceptable if wind permits.';
        } else if (!isSafeForPesticide) {
          recommendation = 'Acceptable for fertilizer application. Avoid pesticide spraying due to wind drift.';
        }

        advisories.push({
          date,
          tempMax,
          tempMin,
          rain,
          wind,
          alerts,
          isSafeForFertilizer,
          isSafeForPesticide,
          recommendation,
        });

        // Find the absolute best window (first day that is 100% safe with no rain/high wind)
        if (!bestWindow && isSafeForFertilizer && isSafeForPesticide && rain === 0 && wind < 8) {
          bestWindow = {
            date,
            reason: 'Clear day with light winds (<8 km/h) and no precipitation.',
          };
        }
      }
    }

    // Default best window fallback if no perfect day is found
    if (!bestWindow && advisories.length > 0) {
      const moderatelySafeDay = advisories.find((adv) => adv.isSafeForFertilizer && adv.isSafeForPesticide);
      if (moderatelySafeDay) {
        bestWindow = {
          date: moderatelySafeDay.date,
          reason: 'Best available day with minimal rain and moderate winds.',
        };
      }
    }

    res.json({
      success: true,
      current: data.current_weather,
      forecast: advisories,
      bestWindow,
    });
  } catch (error) {
    console.error('Weather forecast API error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weather advisories' });
  }
};
