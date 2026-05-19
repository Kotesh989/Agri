export const DEFAULT_NOTIFICATION_DURATION = 4500;

let notificationHandler = null;

export const registerNotificationHandler = (handler) => {
  notificationHandler = handler;
};

export const unregisterNotificationHandler = () => {
  notificationHandler = null;
};

const normalizeErrorText = (error) => {
  if (!error) return 'Something went wrong. Please try again.';
  if (typeof error === 'string') return error;
  if (error?.response?.data) {
    const data = error.response.data;
    if (typeof data.message === 'string' && data.message.trim().length > 0) {
      return data.message;
    }
    if (typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error;
    }
    if (data.errors && typeof data.errors === 'object') {
      return Object.values(data.errors)
        .flat()
        .filter(Boolean)
        .join(' ')
        .trim();
    }
  }
  if (error?.message) {
    if (/network/i.test(error.message)) {
      return 'Unable to connect to the server. Please try again.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

export const getApiErrorMessage = (error, fallbackMessage = 'Unable to complete the request. Please try again.') => {
  const normalized = normalizeErrorText(error);
  return normalized === 'Something went wrong. Please try again.' ? fallbackMessage : normalized;
};

export const showNotification = (type, message, duration = DEFAULT_NOTIFICATION_DURATION) => {
  if (!notificationHandler) return;
  const text = typeof message === 'string' ? message : normalizeErrorText(message);
  notificationHandler(text, type, duration);
};

export const showSuccess = (message, duration = DEFAULT_NOTIFICATION_DURATION) => showNotification('success', message, duration);
export const showError = (message, duration = DEFAULT_NOTIFICATION_DURATION) => showNotification('error', message, duration);
export const showWarning = (message, duration = DEFAULT_NOTIFICATION_DURATION) => showNotification('warning', message, duration);
export const showInfo = (message, duration = DEFAULT_NOTIFICATION_DURATION) => showNotification('info', message, duration);

export const handleApiError = (error, fallbackMessage) => {
  const message = getApiErrorMessage(error, fallbackMessage);
  showError(message);
  return message;
};
