import { createContext, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const confirm = ({
    title = 'Confirm action',
    description = 'Are you sure you want to continue?',
    confirmText = 'Yes',
    cancelText = 'Cancel',
    icon = AlertTriangle,
  }) => {
    return new Promise((resolve) => {
      setDialog({ title, description, confirmText, cancelText, icon, resolve });
    });
  };

  const handleConfirm = () => {
    if (dialog?.resolve) dialog.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    if (dialog?.resolve) dialog.resolve(false);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal isOpen={!!dialog} title={dialog?.title || 'Confirm action'} onClose={handleCancel} size="sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-700 dark:border-gray-800 dark:bg-slate-950 dark:text-gray-100">
            {(() => {
              const Icon = dialog?.icon || AlertTriangle;
              return <Icon className="w-6 h-6 text-amber-500" />;
            })()}
            <p className="text-sm leading-6">{dialog?.description}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleCancel} className="btn btn-secondary">{dialog?.cancelText || 'Cancel'}</button>
            <button onClick={handleConfirm} className="btn btn-danger">
              <CheckCircle className="w-4 h-4 mr-2" />
              {dialog?.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
};
