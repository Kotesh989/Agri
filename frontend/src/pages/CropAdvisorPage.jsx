import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useNotificationContext } from '../components/Notification';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { showError } from '../utils/notificationService';
import { 
  Sprout, MapPin, LandPlot, Droplets, Info, AlertTriangle, 
  CheckCircle, ArrowRight, CloudSun, TrendingUp, DollarSign, 
  HelpCircle, ChevronDown, ChevronUp, Star, RefreshCw
} from 'lucide-react';
import { Bar, Line, Radar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  RadialLinearScale, 
  Title, 
  Tooltip, 
  Legend, 
  Filler, 
  ArcElement 
} from 'chart.js';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  RadialLinearScale, 
  Title, 
  Tooltip, 
  Legend, 
  Filler, 
  ArcElement
);

const SOIL_TYPES = ['Black', 'Red', 'Loamy', 'Sandy', 'Clay', 'Alluvial', 'Laterite', 'Sandy Loam'];
const WATER_SOURCES = ['Borewell', 'Canal', 'Rain-fed', 'River', 'Tank'];
const FARMING_TYPES = ['Organic', 'Traditional', 'Mixed'];

export const CropAdvisorPage = () => {
  const { user } = useAuth();
  const { addNotification } = useNotificationContext();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    state: '',
    district: '',
    taluk: '',
    village: '',
    lat: '',
    lon: '',
    landSize: 1,
    soilType: 'Loamy',
    irrigationAvailable: false,
    waterSource: 'Borewell',
    farmingType: 'Traditional'
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedCrop, setExpandedCrop] = useState(null);
  const [selectedTrendCrop, setSelectedTrendCrop] = useState(null);
  const [detecting, setDetecting] = useState(false);

  // Auto-fill form from user profile on mount
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        state: user.state || prev.state,
        district: user.district || prev.district,
        taluk: user.taluk || prev.taluk,
        village: user.village || prev.village
      }));
    }
  }, [user]);

  // Auto-detect GPS coordinates and reverse geocode location details
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      addNotification('Geolocation is not supported by your browser', 'error');
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude.toFixed(4);
        const longitude = position.coords.longitude.toFixed(4);
        
        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lon: longitude
        }));

        try {
          // OpenStreetMap Nominatim Free Reverse Geocoding API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            
            setFormData(prev => ({
              ...prev,
              state: address.state || prev.state,
              district: address.district || address.county || address.state_district || prev.district,
              taluk: address.suburb || address.town || address.county || prev.taluk,
              village: address.village || address.hamlet || address.neighbourhood || address.suburb || prev.village
            }));
            addNotification('GPS location and address details resolved successfully!', 'success');
          } else {
            addNotification('Coordinates captured, but failed to fetch address details.', 'warning');
          }
        } catch (err) {
          console.warn('Reverse geocoding failed:', err);
          addNotification('Coordinates captured. Address reverse lookup failed.', 'warning');
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        addNotification('Could not detect location. Please input details manually.', 'warning');
        setDetecting(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/crop-recommendation/analyze', formData);
      setResults(response.data.data);
      if (response.data.data?.recommendations?.length > 0) {
        setSelectedTrendCrop(response.data.data.recommendations[0]);
      }
      addNotification('AI Recommendation completed!', 'success');
    } catch (err) {
      showError(err, 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Sparkline chart options
  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: { x: { display: false }, y: { display: false } },
    elements: { point: { radius: 0 } }
  };

  // Profit Comparison Bar Chart
  const profitChartData = {
    labels: results?.recommendations.map(r => r.crop.name) || [],
    datasets: [
      {
        label: 'Expected Profit (₹/Acre)',
        data: results?.recommendations.map(r => r.economics.expectedProfit / formData.landSize) || [],
        backgroundColor: results?.recommendations.map(r => 
          r.risk === 'LOW' ? 'rgba(16, 185, 129, 0.7)' :
          r.risk === 'MEDIUM' ? 'rgba(245, 158, 11, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ),
        borderColor: results?.recommendations.map(r => 
          r.risk === 'LOW' ? 'rgb(16, 185, 129)' :
          r.risk === 'MEDIUM' ? 'rgb(245, 158, 11)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1
      }
    ]
  };

  // 12-Month Price Trend Chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const priceTrendData = {
    labels: months,
    datasets: [
      {
        label: selectedTrendCrop ? `${selectedTrendCrop.crop.name} Price Trend (₹/Quintal)` : '',
        data: selectedTrendCrop ? selectedTrendCrop.priceTrend : [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  // Risk Radar Chart for top crop
  const topCrop = results?.recommendations[0];
  const riskRadarData = {
    labels: ['Price Volatility', 'Pest Risk', 'Water Sensitivity', 'Storage Perishability', 'Transport Sensitivity'],
    datasets: [
      {
        label: topCrop ? topCrop.crop.name : '',
        data: topCrop ? [
          Math.round(topCrop.crop.priceVolatility * 100),
          topCrop.crop.category === 'VEGETABLE' ? 70 : 40,
          topCrop.crop.waterRequirement === 'HIGH' ? 85 : topCrop.crop.waterRequirement === 'MEDIUM' ? 50 : 25,
          Math.max(0, 100 - topCrop.crop.storageLife),
          topCrop.crop.transportSensitivity === 'HIGH' ? 90 : topCrop.crop.transportSensitivity === 'MEDIUM' ? 50 : 20
        ] : [],
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgb(239, 68, 68)',
        pointBackgroundColor: 'rgb(239, 68, 68)'
      }
    ]
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sprout className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              {t('cropAdvisor.title') || 'AI Crop Advisor'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              {t('cropAdvisor.subtitle') || 'Intelligent crop recommendations for maximum profit based on weather, market pricing, and local constraints.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form Column */}
            <div className="lg:col-span-4 card h-fit">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2">
                <LandPlot className="w-5 h-5 text-emerald-600" />
                {t('cropAdvisor.inputTitle') || 'Farm Profile'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.state') || 'State'}</label>
                    <input 
                      type="text" 
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g. Karnataka"
                      className="input py-1.5 text-sm" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.district') || 'District'}</label>
                    <input 
                      type="text" 
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="e.g. Mandya"
                      className="input py-1.5 text-sm" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.taluk') || 'Taluk'}</label>
                    <input 
                      type="text" 
                      value={formData.taluk}
                      onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                      placeholder="e.g. Malavalli"
                      className="input py-1.5 text-sm" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.village') || 'Village'}</label>
                    <input 
                      type="text" 
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      placeholder="e.g. Mandya Village"
                      className="input py-1.5 text-sm" 
                      required 
                    />
                  </div>
                </div>

                {/* GPS Coordinates Section */}
                <div className="bg-slate-50 dark:bg-gray-800/40 p-3 rounded-lg border border-slate-100 dark:border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      GPS Location (Optional)
                    </span>
                    <button 
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detecting}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      {detecting && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {detecting ? 'Resolving Address...' : (t('cropAdvisor.detectLocation') || 'Detect Location')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                      className="input py-1 text-xs"
                    />
                    <input 
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={formData.lon}
                      onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
                      className="input py-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.landSize') || 'Land Size (Acres)'}</label>
                  <input 
                    type="number" 
                    min="0.1" 
                    step="0.1"
                    value={formData.landSize}
                    onChange={(e) => setFormData({ ...formData, landSize: e.target.value })}
                    className="input py-1.5 text-sm" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.soilType') || 'Soil Type'}</label>
                    <select 
                      value={formData.soilType}
                      onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                      className="input py-1.5 text-sm"
                    >
                      {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.farmingType') || 'Farming Type'}</label>
                    <select 
                      value={formData.farmingType}
                      onChange={(e) => setFormData({ ...formData, farmingType: e.target.value })}
                      className="input py-1.5 text-sm"
                    >
                      {FARMING_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input 
                    type="checkbox"
                    id="irrigation"
                    checked={formData.irrigationAvailable}
                    onChange={(e) => setFormData({ ...formData, irrigationAvailable: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="irrigation" className="text-xs font-semibold select-none cursor-pointer">
                    {t('cropAdvisor.irrigation') || 'Irrigation/Water Available'}
                  </label>
                </div>

                {formData.irrigationAvailable && (
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t('cropAdvisor.waterSource') || 'Water Source'}</label>
                    <select 
                      value={formData.waterSource}
                      onChange={(e) => setFormData({ ...formData, waterSource: e.target.value })}
                      className="input py-1.5 text-sm animate-slide-down"
                    >
                      {WATER_SOURCES.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary w-full justify-center py-2.5 font-bold flex items-center gap-2 gradient-emerald"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t('cropAdvisor.analyzing') || 'Analyzing crops...'}
                    </>
                  ) : (
                    <>🌾 {t('cropAdvisor.analyze') || 'Get AI Recommendations'}</>
                  )}
                </button>
              </form>
            </div>

            {/* Results Dashboard Column */}
            <div className="lg:col-span-8 space-y-6">
              {!results ? (
                <div className="card p-16 text-center text-slate-500 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-gray-800">
                  <Sprout className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4 animate-pulse" strokeWidth={1} />
                  <h3 className="text-lg font-bold text-slate-700 dark:text-gray-300">Awaiting Farm Details</h3>
                  <p className="text-sm max-w-sm mt-1">
                    Fill out your farm details and click the button to generate intelligent crop recommendation analyses.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4 border border-slate-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Top Recommendation</span>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                        {results.recommendations[0]?.crop.name}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Profit: {formatCurrency(results.recommendations[0]?.economics.expectedProfit)}
                      </span>
                    </div>

                    <div className="card p-4 border border-slate-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Average Confidence</span>
                      <span className="text-2xl font-black mt-1">
                        {Math.round(results.recommendations.reduce((acc, r) => acc + r.confidence, 0) / results.recommendations.length)}%
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">Based on climate & market match</span>
                    </div>

                    <div className="card p-4 border border-slate-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Crops Evaluated</span>
                      <span className="text-2xl font-black mt-1">35 Crops</span>
                      <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 text-emerald-600 font-bold">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Prices Updated Today
                      </span>
                    </div>

                    <div className="card p-4 border border-slate-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Forecast Climatology</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <CloudSun className="w-5 h-5 text-amber-500" />
                        <span className="text-xl font-black">{results.weatherSummary.avgTemp}°C</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 truncate">Rainfall: {results.weatherSummary.totalRainfall}mm</span>
                    </div>
                  </div>

                  {/* Top 10 Recommendations Grid */}
                  <h3 className="text-xl font-bold tracking-tight mt-6">Recommended Crops (Top 10)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.recommendations.map((rec) => {
                      const isExpanded = expandedCrop === rec.crop.id;
                      const profitPerAcre = rec.economics.expectedProfit / formData.landSize;

                      return (
                        <div 
                          key={rec.crop.id}
                          className="card flex flex-col justify-between p-0 border border-slate-100 dark:border-gray-800 hover:shadow-md transition-shadow overflow-hidden"
                        >
                          {/* Header section */}
                          <div className="p-4 border-b border-slate-50 dark:border-gray-800 flex justify-between items-start gap-3 bg-slate-50/50 dark:bg-slate-900/30">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                  rec.rank === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' :
                                  rec.rank === 2 ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200' :
                                  rec.rank === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200' :
                                  'bg-emerald-50 text-emerald-700'
                                }`}>
                                  #{rec.rank}
                                </span>
                                <h4 className="font-extrabold text-base text-slate-800 dark:text-gray-100">{rec.crop.name}</h4>
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{rec.crop.category}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Confidence Circle Indicator */}
                              <div className="relative w-8 h-8 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" className="text-slate-100 dark:text-gray-800" fill="transparent" />
                                  <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" fill="transparent"
                                    className="text-emerald-500 transition-all duration-500"
                                    strokeDasharray={2 * Math.PI * 13}
                                    strokeDashoffset={2 * Math.PI * 13 * (1 - rec.confidence / 100)} 
                                  />
                                </svg>
                                <span className="absolute text-[8px] font-black text-slate-700 dark:text-gray-300">{rec.confidence}%</span>
                              </div>

                              <span className={`badge text-[9px] font-bold ${
                                rec.risk === 'LOW' ? 'badge-green' :
                                rec.risk === 'MEDIUM' ? 'badge-yellow' : 'badge-red'
                              }`}>
                                {rec.risk} Risk
                              </span>
                            </div>
                          </div>

                          {/* Body Information */}
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Expected Harvest</p>
                                <p className="font-bold text-slate-700 dark:text-gray-300 mt-0.5">{new Date(rec.harvestDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Expected Yield</p>
                                <p className="font-bold text-slate-700 dark:text-gray-300 mt-0.5">{rec.economics.expectedYield}</p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Est. Yield Profit/Acre</p>
                                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(Math.round(profitPerAcre))}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Net Profit</p>
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(rec.economics.expectedProfit)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details Section */}
                          {isExpanded && (
                            <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/30 dark:bg-slate-900/10 space-y-4 animate-slide-down">
                              {/* Sparkline trend */}
                              <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Monthly Price Index Sparkline</span>
                                <div className="h-10 w-full">
                                  <Line 
                                    data={{
                                      labels: months,
                                      datasets: [{ data: rec.priceTrend, borderColor: 'rgb(16, 185, 129)', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0 }]
                                    }} 
                                    options={sparklineOptions} 
                                  />
                                </div>
                              </div>

                              {/* Why this crop (reasons) */}
                              <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 block">Why Grow This?</span>
                                <div className="space-y-1.5">
                                  {rec.reasons.map((r, i) => (
                                    <div key={i} className="flex gap-2 text-xs items-start">
                                      {r.type === 'POSITIVE' && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
                                      {r.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                                      {r.type === 'INFO' && <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                                      <span className="text-slate-600 dark:text-gray-400">{r.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Nearby Market Options */}
                              <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 block">Best Nearby Market Rates</span>
                                <div className="overflow-x-auto">
                                  <table className="table min-w-full text-[10px]">
                                    <thead>
                                      <tr className="bg-slate-100 dark:bg-gray-800">
                                        <th className="py-1 px-2">Market</th>
                                        <th className="py-1 px-2">Distance</th>
                                        <th className="py-1 px-2 text-right">Harvest Rate</th>
                                        <th className="py-1 px-2 text-right">Freight</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rec.nearbyMarkets.map((m, i) => (
                                        <tr key={i} className="border-b dark:border-gray-800">
                                          <td className="py-1 px-2 font-semibold">{m.name}</td>
                                          <td className="py-1 px-2">{m.distance} km</td>
                                          <td className="py-1 px-2 text-right font-bold text-emerald-600">{formatCurrency(m.predictedPrice)}/Q</td>
                                          <td className="py-1 px-2 text-right text-red-500">{formatCurrency(m.transportCost)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Toggle Expand Card Button */}
                          <button 
                            type="button"
                            onClick={() => {
                              setExpandedCrop(isExpanded ? null : rec.crop.id);
                              setSelectedTrendCrop(rec);
                            }}
                            className="w-full py-2 bg-slate-50 dark:bg-gray-800/40 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 flex justify-center items-center gap-1 border-t dark:border-gray-800"
                          >
                            {isExpanded ? (
                              <>Collapse Details <ChevronUp className="w-4 h-4" /></>
                            ) : (
                              <>View Sowing details & Markets <ChevronDown className="w-4 h-4" /></>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Graphs & Charts Dashboard Section */}
                  <h3 className="text-xl font-bold tracking-tight mt-8">Crop Profitability & Market Price Outlook</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Profit Comparison Bar Chart */}
                    <div className="lg:col-span-8 card">
                      <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4">Acreage Yield Profit comparison (₹/Acre)</h4>
                      <div className="h-72">
                        <Bar 
                          data={profitChartData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { ticks: { callback: value => '₹' + value } } }
                          }} 
                        />
                      </div>
                    </div>

                    {/* Risk Radar Chart for Top crop */}
                    <div className="lg:col-span-4 card">
                      <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4">Top Crop Risk Index</h4>
                      <div className="h-72 flex items-center justify-center">
                        <Radar 
                          data={riskRadarData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: { r: { angleLines: { display: true }, suggestMin: 0, suggestMax: 100 } }
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* 12-Month Price Trend line graph */}
                    <div className="lg:col-span-8 card">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Crop Price Cyclical Index (12 Months)</h4>
                        
                        {/* Selector for line graph */}
                        <select 
                          className="input py-1 px-3 text-xs w-48 font-semibold"
                          value={selectedTrendCrop?.crop.id || ''}
                          onChange={(e) => {
                            const found = results.recommendations.find(r => r.crop.id === e.target.value);
                            if (found) setSelectedTrendCrop(found);
                          }}
                        >
                          {results.recommendations.map(r => (
                            <option key={r.crop.id} value={r.crop.id}>{r.crop.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="h-72">
                        <Line 
                          data={priceTrendData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: { y: { ticks: { callback: value => '₹' + value } } }
                          }} 
                        />
                      </div>
                    </div>

                    {/* Nearby Markets Comparison Card */}
                    <div className="lg:col-span-4 card flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4">Best Markets (Selected Crop)</h4>
                        <div className="space-y-3.5">
                          {selectedTrendCrop?.nearbyMarkets.map((m, i) => (
                            <div key={i} className="flex justify-between items-center text-xs border-b pb-2 dark:border-gray-800">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-gray-200">{m.name}</p>
                                <p className="text-[10px] text-gray-400">Distance: {m.distance} km</p>
                              </div>
                              <div className="text-right">
                                <p className="font-extrabold text-emerald-600">{formatCurrency(m.predictedPrice)}/Q</p>
                                <p className="text-[10px] text-red-500">Freight: {formatCurrency(m.transportCost)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t dark:border-gray-800 text-[10px] text-slate-400">
                        * Prices are predicted averages for the expected harvest period. Transportation costs are estimated per quintal volume.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
