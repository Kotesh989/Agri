import { useEffect } from 'react';
import { useNotification } from '../hooks/useNotification';
import { createContext, useContext } from 'react';
import { registerNotificationHandler, unregisterNotificationHandler } from '../utils/notificationService';
import { FlashMessageContainer } from './FlashMessage';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const notificationUtils = useNotification();

  useEffect(() => {
    registerNotificationHandler(notificationUtils.addNotification);
    return () => unregisterNotificationHandler();
  }, [notificationUtils.addNotification]);

  const showSuccess = (message, duration) => notificationUtils.addNotification(message, 'success', duration);
  const showError = (message, duration) => notificationUtils.addNotification(message, 'error', duration);
  const showWarning = (message, duration) => notificationUtils.addNotification(message, 'warning', duration);
  const showInfo = (message, duration) => notificationUtils.addNotification(message, 'info', duration);

  return (
    <NotificationContext.Provider value={{
      ...notificationUtils,
      showSuccess,
      showError,
      showWarning,
      showInfo,
    }}>
      <FlashMessageContainer 
        notifications={notificationUtils.notifications} 
        onRemove={notificationUtils.removeNotification}
      />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};
