import { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useNotificationContext } from '../components/Notification';
import { useConfirm } from '../components/ConfirmProvider';
import { showError } from '../utils/notificationService';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';

const emptyForm = { name: '', contactPerson: '', mobileNumber: '', email: '', city: '', state: '' };

export const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const { addNotification } = useNotificationContext();
  const { confirm } = useConfirm();
  const { t } = useTranslation();

  const fetchSuppliers = async () => {
    const response = await api.get('/suppliers');
    setSuppliers(response.data.data);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const openModal = (supplier = null) => {
    setEditingSupplier(supplier);
    setFormData(supplier ? { ...emptyForm, ...supplier } : emptyForm);
    setShowModal(true);
  };

  const saveSupplier = async (event) => {
    event.preventDefault();
    try {
      if (editingSupplier) await api.put(`/suppliers/${editingSupplier.id}`, formData);
      else await api.post('/suppliers', formData);
      addNotification('Supplier saved successfully', 'success');
      setShowModal(false);
      fetchSuppliers();
    } catch (error) {
      showError(error, 'Error saving supplier');
    }
  };

  const deleteSupplier = async (id) => {
    const confirmed = await confirm({
      title: 'Delete supplier',
      description: 'This supplier will be removed permanently. Continue?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/suppliers/${id}`);
      addNotification('Supplier deleted successfully', 'success');
      fetchSuppliers();
    } catch (error) {
      showError(error, 'Error deleting supplier');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t('nav.suppliers')}</h1>
            <button onClick={() => openModal()} className="btn btn-primary"><Plus className="w-4 h-4 mr-2" /> New Supplier</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead><tr><th>{t('common.name')}</th><th>Contact</th><th>{t('common.phone')}</th><th>{t('common.email')}</th><th>{t('common.city')}</th><th>{t('common.actions')}</th></tr></thead>
              <tbody>{suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td><td>{supplier.contactPerson || '-'}</td><td>{supplier.mobileNumber}</td><td>{supplier.email || '-'}</td><td>{supplier.city || '-'}</td>
                  <td className="flex gap-2">
                    <button onClick={() => openModal(supplier)} className="btn btn-secondary btn-sm"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteSupplier(supplier.id)} className="btn btn-danger btn-sm"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Modal isOpen={showModal} title={editingSupplier ? 'Edit Supplier' : 'New Supplier'} onClose={() => setShowModal(false)}>
            <form onSubmit={saveSupplier} className="space-y-4">
              {Object.keys(emptyForm).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1">{field}</label>
                  <input value={formData[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} className="input" required={field === 'name' || field === 'mobileNumber'} />
                </div>
              ))}
              <div className="flex gap-2"><button className="btn btn-primary flex-1">{t('common.save')}</button><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">{t('common.cancel')}</button></div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
};
