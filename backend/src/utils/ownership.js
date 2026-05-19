import mongoose from 'mongoose';

export const getRequestAdminId = (req) => {
  if (req.user?.role === 'ADMIN') return req.user.userId;
  return req.user?.adminId || req.user?.userId;
};

export const getRequestStoreId = (req) => req.storeId || req.headers?.['x-store-id'] || req.user?.storeId;

export const getOwnerFilter = (req, extra = {}) => {
  const adminId = getRequestAdminId(req);
  if (!adminId) throw new Error('Admin ownership context is missing');
  const storeId = getRequestStoreId(req);
  if (!storeId) throw new Error('Store ownership context is missing');
  return { ...extra, adminId, storeId };
};

export const getOwnerMatch = (req, extra = {}) => {
  const adminId = getRequestAdminId(req);
  if (!adminId) throw new Error('Admin ownership context is missing');
  const storeId = getRequestStoreId(req);
  if (!storeId) throw new Error('Store ownership context is missing');
  return {
    ...extra,
    adminId: mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : adminId,
    storeId: mongoose.Types.ObjectId.isValid(storeId) ? new mongoose.Types.ObjectId(storeId) : storeId,
  };
};

export const ownedDocument = async (model, req, id, session = null) => {
  const query = model.findOne(getOwnerFilter(req, { _id: id }));
  return session ? query.session(session) : query;
};
