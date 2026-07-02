import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useNotificationContext } from '../components/Notification';
import { 
  Calendar, CreditCard, DollarSign, WalletCards, 
  Plus, CheckCircle, Clock, AlertTriangle, ArrowLeft 
} from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { UpiPaymentModal } from '../components/UpiPaymentModal';

export const InstallmentPlannerPage = () => {
  const { addNotification } = useNotificationContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dueId = searchParams.get('dueId');

  const [duesList, setDuesList] = useState([]);
  const [selectedDue, setSelectedDue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Installment plan builder states
  const [numInstallments, setNumInstallments] = useState(3);
  const [interval, setInterval] = useState('monthly'); // monthly, quarterly, harvest
  const [draftInstallments, setDraftInstallments] = useState([]);

  // UPI payment modal state
  const [selectedInstForPayment, setSelectedInstForPayment] = useState(null);

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/farmer-dues?limit=100');
      const list = res.data.data || [];
      setDuesList(list);

      if (dueId) {
        const found = list.find((item) => item.id === dueId);
        if (found) {
          setSelectedDue(found);
          generateDraft(found.remainingAmount, numInstallments, interval);
        }
      }
    } catch {
      addNotification('Error loading dues database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDueSelection = (e) => {
    const id = e.target.value;
    const found = duesList.find((item) => item.id === id);
    setSelectedDue(found || null);
    if (found) {
      generateDraft(found.remainingAmount, numInstallments, interval);
      navigate(`?dueId=${id}`);
    } else {
      setDraftInstallments([]);
      navigate('');
    }
  };

  const generateDraft = (totalAmount, count, recurrence) => {
    const amount = Number((totalAmount / count).toFixed(2));
    const items = [];
    const today = new Date();

    for (let index = 1; index <= count; index += 1) {
      const dueDate = new Date(today);
      if (recurrence === 'monthly') {
        dueDate.setMonth(today.getMonth() + index);
      } else if (recurrence === 'quarterly') {
        dueDate.setMonth(today.getMonth() + index * 3);
      } else if (recurrence === 'harvest') {
        // Harvest interval defaults to every 4 months
        dueDate.setMonth(today.getMonth() + index * 4);
      }
      items.push({
        dueDate: dueDate.toISOString().slice(0, 10),
        amount: index === count ? Number((totalAmount - amount * (count - 1)).toFixed(2)) : amount,
      });
    }
    setDraftInstallments(items);
  };

  const handleParamsChange = (key, value) => {
    if (!selectedDue) return;
    let finalCount = numInstallments;
    let finalRecur = interval;

    if (key === 'count') {
      finalCount = Number(value);
      setNumInstallments(finalCount);
    } else if (key === 'interval') {
      finalRecur = value;
      setInterval(finalRecur);
    }

    generateDraft(selectedDue.remainingAmount, finalCount, finalRecur);
  };

  const handleSavePlan = async () => {
    if (!selectedDue) return;
    try {
      setSaving(true);
      const res = await api.post(`/farmer-dues/${selectedDue.id}/installments`, {
        installments: draftInstallments,
      });
      setSelectedDue(res.data.data);
      addNotification('Installment plan saved successfully.', 'success');
    } catch (err) {
      console.error(err);
      addNotification('Failed to save installment schedule.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const triggerPaymentModal = (inst) => {
    setSelectedInstForPayment({
      installmentId: inst._id || inst.id,
      amount: inst.amount - inst.paidAmount,
    });
  };

  const refreshSelectedDue = async () => {
    if (!selectedDue) return;
    try {
      const res = await api.get(`/farmer-dues/${selectedDue.id}`);
      setSelectedDue(res.data.data);
      fetchDues(); // Refresh sidebar dues summaries
      addNotification('Payment successfully processed.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="mb-6">
            <button onClick={() => navigate('/farmer-dues')} className="btn btn-secondary btn-sm flex items-center gap-1 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Dues
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <WalletCards className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                Installment Planner
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Configure flexible and crop harvest-based installment calendars for outstanding credit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Control Panel */}
            <div className="xl:col-span-5 flex flex-col gap-6">
              <div className="card">
                <h2 className="text-xl font-bold mb-4 font-semibold">Select Farmer Dues</h2>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Search Farmer Due Record</label>
                  <select 
                    value={selectedDue?.id || ''} 
                    onChange={handleDueSelection}
                    className="input font-semibold"
                  >
                    <option value="">Select farmer due</option>
                    {duesList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.farmerName} (Due: {formatCurrency(d.remainingAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDue && (
                  <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-slate-500">Village:</span><span className="font-semibold">{selectedDue.village}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span className="font-semibold">{selectedDue.phoneNumber}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Total Credit:</span><span className="font-semibold">{formatCurrency(selectedDue.dueAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Paid:</span><span className="font-semibold text-emerald-600">{formatCurrency(selectedDue.paidAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Remaining Balance:</span><span className="font-semibold text-rose-600">{formatCurrency(selectedDue.remainingAmount)}</span></div>
                  </div>
                )}
              </div>

              {selectedDue && (!selectedDue.installments || selectedDue.installments.length === 0) && (
                <div className="card">
                  <h2 className="text-xl font-bold mb-4">Plan Repayments</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Number of Installments</label>
                      <input 
                        type="number" 
                        min="2" 
                        max="12" 
                        value={numInstallments} 
                        onChange={(e) => handleParamsChange('count', e.target.value)}
                        className="input" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Repayment Schedule</label>
                      <select 
                        value={interval} 
                        onChange={(e) => handleParamsChange('interval', e.target.value)}
                        className="input"
                      >
                        <option value="monthly">Monthly Intervals</option>
                        <option value="quarterly">Quarterly Intervals</option>
                        <option value="harvest">Harvest Cycle (Every 4 Months)</option>
                      </select>
                    </div>

                    <button 
                      onClick={handleSavePlan}
                      disabled={saving}
                      className="btn btn-primary w-full justify-center"
                    >
                      Save Installment Schedule
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Display / Calendar Panel */}
            <div className="xl:col-span-7">
              {selectedDue ? (
                selectedDue.installments && selectedDue.installments.length > 0 ? (
                  <div className="card">
                    <h2 className="text-xl font-bold mb-4 text-emerald-700 dark:text-emerald-400">Installment Calendar</h2>
                    <div className="space-y-4">
                      {selectedDue.installments.map((inst, index) => {
                        const isPaid = inst.status === 'Paid';
                        const remaining = inst.amount - inst.paidAmount;

                        return (
                          <div 
                            key={inst._id || inst.id} 
                            className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border gap-4 ${
                              isPaid 
                                ? 'bg-emerald-50/20 border-emerald-200 dark:border-emerald-950/20' 
                                : 'bg-slate-50/50 border-slate-200 dark:border-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-full ${isPaid ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                {isPaid ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-gray-200 text-base">
                                  Installment #{index + 1}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" /> Due Date: {formatDate(inst.dueDate)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-right">
                                <p className="font-bold text-slate-900 dark:text-white text-base">
                                  {formatCurrency(inst.amount)}
                                </p>
                                <p className="text-[10px] text-gray-500">Paid: {formatCurrency(inst.paidAmount)}</p>
                              </div>
                              {!isPaid && (
                                <button
                                  onClick={() => triggerPaymentModal(inst)}
                                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                                >
                                  <CreditCard className="w-4 h-4" /> Pay UPI
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <h2 className="text-xl font-bold mb-4">Generated Installment Previews</h2>
                    <div className="space-y-3">
                      {draftInstallments.map((inst, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 dark:border-gray-800 rounded-lg text-sm bg-slate-50/30 dark:bg-slate-900/30">
                          <div>
                            <p className="font-bold">Installment #{idx + 1}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3.5 h-3.5" /> {formatDate(inst.dueDate)}
                            </p>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-gray-200">
                            {formatCurrency(inst.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="card flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                  <CreditCard className="w-16 h-16 text-slate-300 mb-4" strokeWidth={1} />
                  <h2 className="text-xl font-bold mb-1 font-bold">No farmer due selected</h2>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Choose a farmer from the left panel to configure or manage credit dues installment calendars.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {selectedInstForPayment && (
        <UpiPaymentModal
          isOpen={Boolean(selectedInstForPayment)}
          onClose={() => setSelectedInstForPayment(null)}
          amount={selectedInstForPayment.amount}
          farmerName={selectedDue?.farmerName}
          dueId={selectedDue?.id}
          installmentId={selectedInstForPayment.installmentId}
          onPaymentSuccess={refreshSelectedDue}
        />
      )}
    </div>
  );
};
