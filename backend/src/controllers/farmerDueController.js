import { FarmerDue } from '../models/index.js';
import { validationError } from '../utils/http.js';
import { getOwnerFilter, getOwnerMatch, getRequestAdminId, getRequestStoreId, ownedDocument } from '../utils/ownership.js';
import { isTenDigitPhone } from '../utils/validators.js';

const escapeRegex = (value) => String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const VALID_STATUSES = ['Pending', 'Partially Paid', 'Paid'];
const SORT_OPTIONS = {
  highestDue: { remainingAmount: -1, createdAt: -1 },
  lowestDue: { remainingAmount: 1, createdAt: -1 },
  latest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  farmerNameAZ: { farmerName: 1, createdAt: -1 },
};

const normalizeDuePayload = (body) => ({
  farmerName: String(body.farmerName || '').trim(),
  phoneNumber: String(body.phoneNumber || '').replace(/\D/g, ''),
  village: String(body.village || '').trim(),
  dueAmount: Number(body.dueAmount || 0),
  description: String(body.description || '').trim(),
});

const validateDuePayload = (payload) => {
  if (!payload.farmerName) return 'Farmer name is required';
  if (!isTenDigitPhone(payload.phoneNumber)) return 'Phone number must be 10 digits';
  if (!payload.village) return 'Village is required';
  if (!Number.isFinite(payload.dueAmount) || payload.dueAmount <= 0) return 'Due amount must be greater than zero';
  return null;
};

export const buildListFilter = (req) => {
  const filter = getOwnerFilter(req);
  const {
    search,
    farmerName,
    phoneNumber,
    village,
    status,
    startDate,
    endDate,
    dueAmount,
    paidAmount,
    remainingAmount,
  } = req.query;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    const numericSearch = Number(String(search).replace(/[^\d.]/g, ''));
    filter.$or = [
      { farmerName: regex },
      { phoneNumber: regex },
      { village: regex },
      { status: regex },
      { description: regex },
      ...(Number.isFinite(numericSearch) && String(search).match(/\d/)
        ? [
            { dueAmount: numericSearch },
            { paidAmount: numericSearch },
            { remainingAmount: numericSearch },
          ]
        : []),
    ];
  }
  if (farmerName) filter.farmerName = new RegExp(escapeRegex(farmerName), 'i');
  if (phoneNumber) filter.phoneNumber = new RegExp(escapeRegex(String(phoneNumber).replace(/\D/g, '')), 'i');
  if (village) filter.village = new RegExp(escapeRegex(village), 'i');
  if (status && VALID_STATUSES.includes(status)) filter.status = status;
  if (dueAmount !== undefined && dueAmount !== '') filter.dueAmount = Number(dueAmount);
  if (paidAmount !== undefined && paidAmount !== '') filter.paidAmount = Number(paidAmount);
  if (remainingAmount !== undefined && remainingAmount !== '') filter.remainingAmount = Number(remainingAmount);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  return filter;
};

const buildSort = (sort) => SORT_OPTIONS[sort] || SORT_OPTIONS.latest;

export const listDueRecords = async (req) => {
  const filter = buildListFilter(req);
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  const sort = buildSort(req.query.sort);

  const [dues, total] = await Promise.all([
    FarmerDue.find(filter).sort(sort).skip(skip).limit(limit),
    FarmerDue.countDocuments(filter),
  ]);

  return {
    dues,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const getDueSummaryData = async (req) => {
  const ownerMatch = getOwnerMatch(req);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totals, statusCounts, paidToday, monthlyCollection] = await Promise.all([
    FarmerDue.aggregate([
      { $match: ownerMatch },
      { $group: { _id: null, totalDueAmount: { $sum: '$remainingAmount' } } },
    ]),
    FarmerDue.aggregate([
      { $match: ownerMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    FarmerDue.aggregate([
      { $match: ownerMatch },
      { $unwind: '$paymentHistory' },
      { $match: { 'paymentHistory.paymentDate': { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$paymentHistory.amount' } } },
    ]),
    FarmerDue.aggregate([
      { $match: ownerMatch },
      { $unwind: '$paymentHistory' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paymentHistory.paymentDate' } },
          total: { $sum: '$paymentHistory.amount' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
  ]);

  const counts = statusCounts.reduce((map, item) => ({ ...map, [item._id]: item.count }), {});
  return {
    totalDueAmount: Number((totals[0]?.totalDueAmount || 0).toFixed(2)),
    totalPendingFarmers: counts.Pending || 0,
    totalPartiallyPaid: counts['Partially Paid'] || 0,
    totalPaidToday: Number((paidToday[0]?.total || 0).toFixed(2)),
    statusChart: VALID_STATUSES.map((status) => ({ status, count: counts[status] || 0 })),
    monthlyDueCollection: monthlyCollection.map((item) => ({ month: item._id, total: Number(item.total.toFixed(2)) })),
  };
};

export const createDueRecord = async (req) => {
  const payload = normalizeDuePayload(req.body);
  const inputError = validateDuePayload(payload);
  if (inputError) throw new Error(inputError);

  return FarmerDue.create({
    ...payload,
    adminId: getRequestAdminId(req),
    storeId: getRequestStoreId(req),
    createdBy: getRequestAdminId(req),
  });
};

export const updateDueRecord = async (req) => {
  const due = await ownedDocument(FarmerDue, req, req.params.id);
  if (!due) throw new Error('Due not found');

  const payload = normalizeDuePayload({ ...due.toObject(), ...req.body });
  const inputError = validateDuePayload(payload);
  if (inputError) throw new Error(inputError);
  if (payload.dueAmount < Number(due.paidAmount || 0)) {
    throw new Error('Due amount cannot be less than the amount already paid');
  }

  Object.assign(due, payload);
  await due.save();
  return due;
};

export const recordDuePayment = async (req) => {
  const due = await ownedDocument(FarmerDue, req, req.params.id);
  if (!due) throw new Error('Due not found');

  const paymentAmount = Number(req.body.paymentAmount || 0);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }
  if (paymentAmount > Number(due.remainingAmount || 0)) {
    throw new Error('Payment cannot exceed remaining amount');
  }

  due.paidAmount = Number((Number(due.paidAmount || 0) + paymentAmount).toFixed(2));
  due.paymentHistory.push({
    amount: paymentAmount,
    paymentDate: new Date(),
    recordedBy: getRequestAdminId(req),
  });
  await due.save();
  return due;
};

export const deleteDueRecord = async (req) => {
  const due = await FarmerDue.findOneAndDelete(getOwnerFilter(req, { _id: req.params.id }));
  if (!due) throw new Error('Due not found');
  return due;
};

export const createDue = async (req, res) => {
  try {
    const due = await createDueRecord(req);
    res.status(201).json({ success: true, message: 'Due added successfully', data: due });
  } catch (error) {
    console.error('Create farmer due error:', error);
    if (error.message === 'Due not found') return res.status(404).json({ success: false, message: error.message });
    return validationError(res, error.message || 'Internal server error');
  }
};

export const listDues = async (req, res) => {
  try {
    const { dues, pagination } = await listDueRecords(req);
    res.json({ success: true, data: dues, pagination });
  } catch (error) {
    console.error('List farmer dues error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDue = async (req, res) => {
  try {
    const due = await ownedDocument(FarmerDue, req, req.params.id);
    if (!due) return res.status(404).json({ success: false, message: 'Due not found' });
    res.json({ success: true, data: due });
  } catch (error) {
    console.error('Get farmer due error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateDue = async (req, res) => {
  try {
    const due = await updateDueRecord(req);
    res.json({ success: true, message: 'Due updated successfully', data: due });
  } catch (error) {
    console.error('Update farmer due error:', error);
    if (error.message === 'Due not found') return res.status(404).json({ success: false, message: error.message });
    return validationError(res, error.message || 'Internal server error');
  }
};

export const recordPayment = async (req, res) => {
  try {
    const due = await recordDuePayment(req);
    res.json({ success: true, message: 'Payment recorded successfully', data: due });
  } catch (error) {
    console.error('Record farmer due payment error:', error);
    if (error.message === 'Due not found') return res.status(404).json({ success: false, message: error.message });
    return validationError(res, error.message || 'Internal server error');
  }
};

export const deleteDue = async (req, res) => {
  try {
    await deleteDueRecord(req);
    res.json({ success: true, message: 'Due deleted successfully' });
  } catch (error) {
    console.error('Delete farmer due error:', error);
    if (error.message === 'Due not found') return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDueSummary = async (req, res) => {
  try {
    const data = await getDueSummaryData(req);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get farmer due summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
