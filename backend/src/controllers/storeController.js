import { CustomerPurchasedItem, FarmerStoreLink, Invoice, Settings, Store, User } from '../models/index.js';
import { getRequestAdminId } from '../utils/ownership.js';

const createDefaultStoreForAdmin = async (owner) => {
  const store = await Store.create({
    ownerAdminId: owner._id,
    name: `${owner.name}'s Store`,
    ownerName: owner.name,
    subscriptionStatus: 'ACTIVE',
  });
  await Settings.findOneAndUpdate(
    { adminId: owner._id },
    { adminId: owner._id, storeId: store._id, shopName: store.name },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  return store;
};

const summarizeLink = async (link) => {
  const [manualPurchases, invoices, settings] = await Promise.all([
    CustomerPurchasedItem.find({ customerId: link.customerId, storeId: link.storeId }),
    Invoice.find({ customerId: link.customerId, storeId: link.storeId }).sort({ invoiceDate: -1 }),
    Settings.findOne({ storeId: link.storeId }),
  ]);

  return {
    id: link.storeId.id,
    storeId: link.storeId.id,
    storeName: link.storeId.name,
    ownerName: link.storeId.ownerName,
    contactNumber: link.storeId.mobileNumber,
    address: link.storeId.address,
    totalPurchases: manualPurchases.length,
    outstandingDue: invoices.reduce((sum, invoice) => sum + Math.max(Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0), 0), 0),
    lastVisitDate: link.lastVisitDate,
    settings,
  };
};

export const listFarmerStores = async (req, res) => {
  try {
    const links = await FarmerStoreLink.find({ farmerId: req.user.userId }).populate('storeId');
    const data = await Promise.all(links.filter((link) => link.storeId).map(summarizeLink));
    res.json({ success: true, data });
  } catch (error) {
    console.error('List farmer stores error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const switchFarmerStore = async (req, res) => {
  try {
    const link = await FarmerStoreLink.findOne({ farmerId: req.user.userId, storeId: req.params.storeId });
    if (!link) return res.status(404).json({ success: false, message: 'Store link not found' });
    link.lastVisitDate = new Date();
    await link.save();
    res.json({ success: true, data: { storeId: link.storeId.toString() } });
  } catch (error) {
    console.error('Switch farmer store error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createStore = async (req, res) => {
  try {
    const owner = await User.findById(getRequestAdminId(req));
    const store = await Store.create({
      ownerAdminId: owner._id,
      name: req.body.name,
      ownerName: req.body.ownerName || owner.name,
      mobileNumber: req.body.mobileNumber,
      address: req.body.address,
      village: req.body.village,
      taluk: req.body.taluk,
      district: req.body.district,
      state: req.body.state,
      gstNumber: req.body.gstNumber,
      logo: req.body.logo,
      subscriptionStatus: req.body.subscriptionStatus || 'ACTIVE',
    });
    await Settings.create({ adminId: owner._id, storeId: store._id, shopName: store.name });
    res.status(201).json({ success: true, data: store });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listAdminStores = async (req, res) => {
  try {
    const adminId = getRequestAdminId(req);
    let stores = await Store.find({ ownerAdminId: adminId }).sort({ createdAt: -1 });
    if (stores.length === 0) {
      const owner = await User.findById(adminId);
      if (!owner) return res.status(404).json({ success: false, message: 'Admin user not found' });
      await createDefaultStoreForAdmin(owner);
      stores = await Store.find({ ownerAdminId: adminId }).sort({ createdAt: -1 });
    }
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('List admin stores error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
