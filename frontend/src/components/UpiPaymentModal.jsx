import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { X, CheckCircle, Smartphone, Info } from 'lucide-react';
import { Modal } from './Modal';
import { formatCurrency } from '../utils/helpers';
import api from '../utils/api';

export const UpiPaymentModal = ({ isOpen, onClose, amount, farmerName, dueId, installmentId, onPaymentSuccess }) => {
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('UPI');
  const [notes, setNotes] = useState('Installment Payment');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get('/settings')
        .then((res) => {
          setShopSettings(res.data.data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  const upiId = shopSettings?.upiId || 'agri.store@okaxis';
  const shopName = shopSettings?.shopName || 'Agri Fertilizer Shop';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&tn=${encodeURIComponent(`DUE_${dueId}`)}`;

  const handleRecordDirectPayment = async () => {
    try {
      let endpoint = `/farmer-dues/${dueId}/payment`;
      const payload = { 
        paymentAmount: Number(amount), 
        paymentMethod: 'UPI', 
        notes: notes || `UPI Payment for Due ID ${dueId}` 
      };

      if (installmentId) {
        endpoint = `/farmer-dues/${dueId}/installments/${installmentId}/pay`;
      }

      await api.post(endpoint, payload);
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Scan QR to Pay" onClose={onClose} size="md">
      {loading ? (
        <p className="text-center py-6 text-slate-500">Loading payment details...</p>
      ) : (
        <div className="flex flex-col items-center p-4 text-center">
          <p className="text-sm text-slate-500 mb-2">Scan with GPay, PhonePe, Paytm, or BHIM</p>
          <p className="text-2xl font-black text-slate-800 dark:text-gray-100 mb-4">
            {formatCurrency(amount)}
          </p>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm mb-4">
            <QRCode value={upiUrl} size={180} />
          </div>

          <div className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl p-3.5 text-xs text-left mb-5 space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Merchant UPI ID:</span><span className="font-semibold">{upiId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Payee Name:</span><span className="font-semibold">{shopName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Farmer:</span><span className="font-semibold">{farmerName}</span></div>
          </div>

          <div className="flex flex-col w-full gap-2">
            <button 
              onClick={handleRecordDirectPayment}
              className="btn btn-primary w-full justify-center"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Confirm Paid via App
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary w-full justify-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
