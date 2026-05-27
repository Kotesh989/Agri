// Format currency
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format date and time
export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get status badge color
export const getStatusColor = (status) => {
  const colors = {
    PENDING: 'badge-yellow',
    UNPAID: 'badge-yellow',
    PAID: 'badge-green',
    PARTIAL: 'badge-blue',
    OVERDUE: 'badge-red',
    CANCELLED: 'badge-red',
    RECEIVED: 'badge-green',
    COMPLETED: 'badge-green',
  };
  return colors[status] || 'badge-blue';
};

// Validate email
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate phone number
export const validatePhone = (phone) => {
  const re = /^[0-9]{10}$/;
  return re.test(phone.replace(/\D/g, ''));
};
