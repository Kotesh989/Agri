import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export const FlashMessage = ({ notification, onRemove }) => {
  const getConfig = (type) => {
    const configs = {
      success: {
        bgColor: 'bg-gradient-to-r from-emerald-500 to-teal-500',
        borderColor: 'border-emerald-600',
        icon: CheckCircle,
      },
      error: {
        bgColor: 'bg-gradient-to-r from-rose-500 to-red-500',
        borderColor: 'border-rose-600',
        icon: AlertCircle,
      },
      warning: {
        bgColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
        borderColor: 'border-amber-600',
        icon: AlertTriangle,
      },
      info: {
        bgColor: 'bg-gradient-to-r from-blue-500 to-indigo-500',
        borderColor: 'border-blue-600',
        icon: Info,
      },
    };
    return configs[type] || configs.info;
  };

  const config = getConfig(notification.type);
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className={`${config.bgColor} ${config.borderColor} text-white relative flex w-full max-w-lg items-center justify-between gap-4 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-sm border-l-4 hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex items-center gap-3 flex-1">
        <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
        <span className="font-medium text-sm leading-snug break-words">{notification.message}</span>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-all duration-200 opacity-80 hover:opacity-100 flex-shrink-0"
        aria-label="Close notification"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-xl overflow-hidden">
        <motion.div
          className="h-full bg-white/70 rounded-b-xl"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: (notification.duration || 4500) / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
};

export const FlashMessageContainer = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <FlashMessage notification={notification} onRemove={onRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
