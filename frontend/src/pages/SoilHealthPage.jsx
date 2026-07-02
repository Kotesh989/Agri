import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useNotificationContext } from '../components/Notification';
import { 
  FlaskConical, CheckCircle, AlertCircle, ShoppingCart, 
  Trash2, History, ChevronRight, Clipboard, Plus 
} from 'lucide-react';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

export const SoilHealthPage = () => {
  const { addNotification } = useNotificationContext();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    pH: '',
    organicCarbon: '',
    crop: 'PADDY',
    acreage: '1',
    soilType: 'Clayey Soil',
  });

  const [recommendationResult, setRecommendationResult] = useState(null);

  useEffect(() => {
    // Fetch customers to link soil card
    api.get('/customers')
      .then((res) => setCustomers(res.data.data || []))
      .catch(() => addNotification('Error loading customers list.', 'error'));
  }, []);

  const fetchHistory = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/soil-health/${id}/history`);
      setHistory(res.data.data || []);
    } catch {
      addNotification('Error loading soil history.', 'error');
    }
  };

  const handleCustomerChange = (e) => {
    const id = e.target.value;
    setSelectedCustomerId(id);
    setRecommendationResult(null);
    if (id) {
      fetchHistory(id);
    } else {
      setHistory([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      addNotification('Please select a customer first.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        customerId: selectedCustomerId,
        nitrogen: Number(formData.nitrogen) || 0,
        phosphorus: Number(formData.phosphorus) || 0,
        potassium: Number(formData.potassium) || 0,
        pH: formData.pH ? Number(formData.pH) : undefined,
        organicCarbon: formData.organicCarbon ? Number(formData.organicCarbon) : undefined,
        crop: formData.crop,
        acreage: Number(formData.acreage) || 1,
        soilType: formData.soilType,
      };

      const res = await api.post('/soil-health', payload);
      setRecommendationResult(res.data.data);
      addNotification('Soil recommendation calculated successfully.', 'success');
      fetchHistory(selectedCustomerId);
    } catch (err) {
      console.error(err);
      addNotification('Error calculating recommendation.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToCart = async (item) => {
    if (!selectedCustomerId) return;
    if (!item.productId) {
      addNotification('No matching inventory item found for this fertilizer.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        productId: item.productId,
        productName: item.productName,
        category: 'FERTILIZER',
        quantity: item.bagsRequired,
        unitType: 'Bag',
        pricePerUnit: item.pricePerBag,
        purchaseDate: new Date().toISOString().slice(0, 10),
        notes: `Soil recommendation for ${formData.crop}`,
      };

      await api.post(`/customers/${selectedCustomerId}/purchased-items`, payload);
      addNotification(`Added ${item.bagsRequired} bags of ${item.productName} to farmer ledger.`, 'success');
      
      // Update local state to mark added
      setRecommendationResult(current => {
        if (!current) return null;
        const updatedFertilizers = current.recommendations.fertilizers.map(f => {
          if (f.productId === item.productId) {
            return { ...f, alreadyAdded: true };
          }
          return f;
        });
        return {
          ...current,
          recommendations: {
            ...current.recommendations,
            fertilizers: updatedFertilizers
          }
        };
      });
    } catch (err) {
      console.error(err);
      addNotification(err.response?.data?.message || 'Error recording item to ledger.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FlaskConical className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                Soil Health & NPK Calculator
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Enter soil test values and crop variables to calculate recommended fertilizer quantities.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Input Form Card */}
            <div className="xl:col-span-5 flex flex-col gap-6">
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Soil Card Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Farmer / Customer *</label>
                    <select
                      value={selectedCustomerId}
                      onChange={handleCustomerChange}
                      className="input"
                      required
                    >
                      <option value="">Select a customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.mobileNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nitrogen (N) (kg/acre)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 20"
                        value={formData.nitrogen}
                        onChange={(e) => setFormData({ ...formData, nitrogen: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phosphorus (P) (kg/acre)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 15"
                        value={formData.phosphorus}
                        onChange={(e) => setFormData({ ...formData, phosphorus: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Potassium (K)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 18"
                        value={formData.potassium}
                        onChange={(e) => setFormData({ ...formData, potassium: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">pH</label>
                      <input
                        type="number"
                        min="0"
                        max="14"
                        step="0.1"
                        placeholder="e.g. 6.5"
                        value={formData.pH}
                        onChange={(e) => setFormData({ ...formData, pH: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Carbon (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="e.g. 0.5"
                        value={formData.organicCarbon}
                        onChange={(e) => setFormData({ ...formData, organicCarbon: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Crop to Plant *</label>
                      <select
                        value={formData.crop}
                        onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                        className="input"
                      >
                        <option value="PADDY">Paddy (Rice)</option>
                        <option value="WHEAT">Wheat</option>
                        <option value="COTTON">Cotton</option>
                        <option value="TOMATO">Tomato</option>
                        <option value="MAIZE">Maize</option>
                        <option value="CHILLI">Chilli</option>
                        <option value="ONION">Onion</option>
                        <option value="SUGARCANE">Sugarcane</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Acreage *</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={formData.acreage}
                        onChange={(e) => setFormData({ ...formData, acreage: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Soil Type</label>
                    <select
                      value={formData.soilType}
                      onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                      className="input"
                    >
                      <option value="Clayey Soil">Clayey Soil</option>
                      <option value="Black Soil">Black Soil</option>
                      <option value="Red Soil">Red Soil</option>
                      <option value="Alluvial Soil">Alluvial Soil</option>
                      <option value="Sandy Soil">Sandy Soil</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-full justify-center"
                    disabled={saving}
                  >
                    {saving ? 'Calculating...' : 'Calculate Recommendation'}
                  </button>
                </form>
              </div>

              {/* History list */}
              {selectedCustomerId && history.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-1.5">
                    <History className="w-5 h-5 text-gray-500" />
                    Soil Card History
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {history.map((card) => (
                      <div 
                        key={card.id} 
                        onClick={() => setRecommendationResult(card)}
                        className="p-3 border border-slate-100 dark:border-gray-800 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center text-sm"
                      >
                        <div>
                          <p className="font-bold text-slate-800 dark:text-gray-200">
                            {card.crop} ({card.acreage} Acres)
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            N: {card.nitrogen} • P: {card.phosphorus} • K: {card.potassium}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results Card */}
            <div className="xl:col-span-7">
              {recommendationResult ? (
                <div className="card flex flex-col gap-6">
                  <div className="flex flex-wrap justify-between items-start gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Nutrient Recommendation Result</h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Recommended commercial fertilizers required for crop: <span className="font-semibold">{recommendationResult.crop}</span> across <span className="font-semibold">{recommendationResult.acreage} acres</span>.
                      </p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-200/50 text-xs font-bold">
                      Expected Yield: +{recommendationResult.recommendations.expectedYieldImprovement}%
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Required Fertilizer Bags</h3>
                    {recommendationResult.recommendations.fertilizers.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-gray-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50"
                      >
                        <div>
                          <p className="font-bold text-base text-slate-800 dark:text-gray-200">
                            {item.bagsRequired} Bags of {item.fertilizerType}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Product matched: {item.productName} ({formatCurrency(item.pricePerBag)} / bag)
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-base text-slate-900 dark:text-white">
                            {formatCurrency(item.cost)}
                          </span>
                          {item.productId ? (
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={loading || item.alreadyAdded}
                              className={`btn btn-sm flex items-center gap-1.5 ${
                                item.alreadyAdded 
                                  ? 'bg-gray-100 text-gray-400 border-none cursor-default' 
                                  : 'btn-primary'
                              }`}
                            >
                              <ShoppingCart className="w-4 h-4" />
                              {item.alreadyAdded ? 'Ledgered' : 'Add to Ledger'}
                            </button>
                          ) : (
                            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded border border-amber-200/50">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Estimated Total Recommendation Cost</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(recommendationResult.recommendations.estimatedCost)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                  <FlaskConical className="w-16 h-16 text-slate-300 mb-4" strokeWidth={1} />
                  <h2 className="text-xl font-bold mb-1">No recommendation calculated</h2>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Select a farmer and input their soil card variables, then click Calculate to receive NPK recommendations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
