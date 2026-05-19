import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const Modal = ({ isOpen, title, children, onClose, size = 'md' }) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className={`w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#151d19] sm:p-8 ${sizeClasses[size]}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="rounded-lg p-2 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-gray-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
