import { AuditLog } from '../models/index.js';
import { getRequestAdminId, getRequestStoreId } from './ownership.js';

export const writeAuditLog = async (req, action, entityType, entityId, metadata = {}) => {
  try {
    if (AuditLog.db.readyState !== 1) return;
    await AuditLog.create({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      userId: req.user?.userId,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (error) {
    console.warn('Audit log skipped:', error.message);
  }
};
