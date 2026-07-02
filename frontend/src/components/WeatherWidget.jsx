import { useState, useEffect } from 'react';
import { 
  Sun, Cloud, CloudRain, Wind, Thermometer, AlertTriangle, 
  CheckCircle, MapPin, Loader, Navigation, Calendar 
} from 'lucide-react';
import api from '../utils/api';

const getWeatherIcon = (code) => {
  if (code === 0) return <Sun className="w-8 h-8 text-yellow-500 animate-pulse" />;
  if ([1, 2, 3].includes(code)) return <Cloud className="w-8 h-8 text-blue-400" />;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="w-8 h-8 text-blue-600" />;
  return <Cloud className="w-8 h-8 text-gray-500" />;
};

export const WeatherWidget = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [coords, setCoords] = useState({ lat: 12.9716, lon: 77.5946, name: 'Default (Bengaluru)' });
  const [locating, setLocating] = useState(false);

  const fetchWeather = async (latitude, longitude) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/weather/forecast?lat=${latitude}&lon=${longitude}`);
      setWeatherData(response.data);
    } catch (err) {
      console.error(err);
      setError('Unable to load weather forecast.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(coords.lat, coords.lon);
  }, [coords.lat, coords.lon]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          name: 'Current Location',
        });
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setError('Location access denied. Using default.');
        setLocating(false);
      }
    );
  };

  if (loading && !weatherData) {
    return (
      <div className="card flex items-center justify-center p-8">
        <Loader className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading weather forecast...</span>
      </div>
    );
  }

  const current = weatherData?.current || {};
  const forecast = weatherData?.forecast || [];
  const bestWindow = weatherData?.bestWindow;
  const currentAdvisory = forecast[0] || {};

  return (
    <div className="card shadow-md transition hover:shadow-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sun className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Weather & Fertilizer Advisory
          </h3>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            {coords.name} ({coords.lat.toFixed(4)}, {coords.lon.toFixed(4)})
          </p>
        </div>
        <button
          onClick={handleLocate}
          disabled={locating}
          className="btn btn-secondary btn-sm flex items-center gap-1.5"
          title="Use GPS Location"
        >
          <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          {locating ? 'Locating...' : 'Use GPS'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {weatherData && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Current weather and widget stats */}
          <div className="md:col-span-4 flex flex-col justify-between p-4 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800">
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Current Temperature</span>
              <div className="flex items-center gap-3 mt-1">
                {getWeatherIcon(current.weathercode)}
                <span className="text-3xl font-extrabold">{current.temperature}°C</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400">
                <Wind className="w-4 h-4 text-slate-500" />
                <span>Wind: {current.windspeed} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400">
                <Thermometer className="w-4 h-4 text-slate-500" />
                <span>Max: {currentAdvisory.tempMax}°C</span>
              </div>
            </div>
          </div>

          {/* Forecast & Advisory Alerts */}
          <div className="md:col-span-8 flex flex-col justify-between">
            {/* Advisory section */}
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agronomic Advisory</span>
              {currentAdvisory.alerts?.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {currentAdvisory.alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200/50 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 text-xs">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{currentAdvisory.recommendation || 'Conditions are safe for fertilizer & pesticide application.'}</span>
                </div>
              )}
            </div>

            {/* Best application window recommendation */}
            {bestWindow && (
              <div className="p-3 rounded-lg bg-emerald-600 text-white flex items-start gap-2.5 text-xs shadow-sm">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Suggested Application Window</p>
                  <p className="opacity-90 mt-0.5">
                    Apply on <span className="underline font-semibold">{bestWindow.date}</span>: {bestWindow.reason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7-day small horizontal scroll for forecast */}
      {weatherData && (
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800 overflow-x-auto">
          <div className="flex space-x-3 pb-2 min-w-[500px]">
            {forecast.map((day, idx) => (
              <div 
                key={idx} 
                className={`flex-1 min-w-[76px] flex flex-col items-center p-2 rounded-lg border text-center transition-all ${
                  idx === 0 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-gray-800'
                }`}
              >
                <span className="text-[10px] text-gray-500 font-semibold uppercase">
                  {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <div className="my-1.5">{getWeatherIcon(day.rain > 5 ? 61 : 0)}</div>
                <span className="text-[11px] font-bold">{day.tempMax}° / {day.tempMin}°</span>
                <span className="text-[9px] text-blue-500 font-medium mt-1">
                  {day.rain > 0 ? `${day.rain} mm` : '0 mm'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
