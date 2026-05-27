export const validGstRates = new Set([0, 5, 12, 18, 28]);

export const isTenDigitPhone = (value) => /^\d{10}$/.test(String(value || '').trim());

export const isValidEmail = (value) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

export const isValidGstNumber = (value) =>
  !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(String(value).trim());

export const isValidDateValue = (value) => {
  if (!value) return true;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
};
