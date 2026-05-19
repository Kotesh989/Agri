import { Settings } from '../models/index.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId } from '../utils/ownership.js';

const upiIdRegex = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne(getOwnerFilter(req));
    if (!settings) {
      settings = await Settings.create({ adminId: getRequestAdminId(req), storeId: getRequestStoreId(req) });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.expiryAlertDays !== undefined) update.expiryAlertDays = Number(update.expiryAlertDays);
    if (update.upiId !== undefined) {
      update.upiId = String(update.upiId || '').trim();
      if (update.upiId && !upiIdRegex.test(update.upiId)) {
        return res.status(400).json({ success: false, message: 'Invalid UPI ID format' });
      }
      if (!update.upiId) update.upiId = undefined;
    }
    if (update.accountHolderName !== undefined) {
      update.accountHolderName = String(update.accountHolderName || '').trim() || undefined;
    }
    if (update.bankName !== undefined) {
      update.bankName = String(update.bankName || '').trim() || undefined;
    }
    if (update.customUpiQrImageUrl !== undefined) {
      update.customUpiQrImageUrl = String(update.customUpiQrImageUrl || '').trim();
      if (update.customUpiQrImageUrl && !isValidHttpUrl(update.customUpiQrImageUrl)) {
        return res.status(400).json({ success: false, message: 'Custom QR image URL must be a valid http or https URL' });
      }
      if (!update.customUpiQrImageUrl) update.customUpiQrImageUrl = undefined;
    }

    const settings = await Settings.findOneAndUpdate(getOwnerFilter(req), { ...update, adminId: getRequestAdminId(req), storeId: getRequestStoreId(req) }, {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    });

    res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
