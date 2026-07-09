import mongoose from 'mongoose';
import {
  AvailabilityRequest,
  Customer,
  CustomerPurchasedItem,
  FarmerStoreLink,
  Invoice,
  Product,
  Settings,
  Store,
  User,
  WishlistItem,
} from '../models/index.js';

const ensurePurchasedFromStore = async (farmerUserId, storeId) => {
  const invoiceFilter = await getFarmerInvoiceFilter({ user: { userId: farmerUserId } }, { storeId });
  const invoice = await Invoice.findOne(invoiceFilter).select('_id storeId');
  if (invoice) return true;
  const customerIds = await getFarmerCustomerIds(farmerUserId);
  if (customerIds.length === 0) return false;
  const manualPurchase = await CustomerPurchasedItem.findOne({ customerId: { $in: customerIds }, storeId }).select('_id storeId');
  return Boolean(manualPurchase);
};

const getFarmerCustomerIds = async (farmerUserId) => {
  const customers = await Customer.find({ farmerUserId }).select('_id');
  return customers.map((customer) => customer._id);
};

const getFarmerInvoiceFilter = async (req, extra = {}) => {
  const customerIds = await getFarmerCustomerIds(req.user.userId);
  const ownership = [{ farmerUserId: req.user.userId }];
  if (customerIds.length > 0) ownership.push({ customerId: { $in: customerIds } });
  return { ...extra, $or: ownership };
};

const getFarmerCustomer = async (req) => {
  const user = await User.findById(req.user.userId);
  const storeId = req.headers['x-store-id'] || req.user.storeId;
  const link = storeId ? await FarmerStoreLink.findOne({ farmerId: user?._id, storeId }) : null;
  const customerId = link?.customerId || user?.customerId;
  if (!customerId) return null;
  const customer = await Customer.findOne({
    _id: customerId,
    ...(storeId ? { storeId } : {}),
  });
  return customer ? { user, customer, storeId } : null;
};

const asId = (value) => value?.id || value?._id?.toString?.() || value?.toString?.();

const getStoreFallback = (invoice) => {
  const store = invoice.storeId;
  const admin = invoice.adminId;
  const storeName =
    invoice.storeSnapshot?.storeName ||
    store?.name ||
    admin?.businessName ||
    admin?.shopName ||
    admin?.companyName ||
    admin?.name ||
    'Unknown Store';
  const ownerName =
    invoice.storeSnapshot?.ownerName ||
    store?.ownerName ||
    admin?.ownerName ||
    admin?.name ||
    '';
  const phone =
    invoice.storeSnapshot?.phone ||
    store?.mobileNumber ||
    admin?.mobileNumber ||
    '';
  const address =
    invoice.storeSnapshot?.address ||
    store?.address ||
    admin?.businessAddress ||
    admin?.address ||
    '';

  return {
    storeId: asId(store) || asId(invoice.storeId) || asId(admin) || asId(invoice.adminId),
    adminId: asId(admin) || asId(invoice.adminId),
    storeName,
    ownerName,
    phone,
    address,
  };
};

const publicPaymentSettings = (settings) => settings?.upiId ? {
  upiId: settings.upiId,
  accountHolderName: settings.accountHolderName || '',
  bankName: settings.bankName || '',
  customUpiQrImageUrl: settings.customUpiQrImageUrl || '',
} : null;

const toManualInvoiceRow = (item, settings = null) => {
  const storeInfo = getStoreFallback(item);
  return {
    id: `manual-${item.id}`,
    invoiceNumber: 'Customer Purchase',
    invoiceDate: item.purchaseDate,
    storeId: storeInfo.storeId,
    adminId: storeInfo.adminId,
    storeName: storeInfo.storeName,
    shopName: storeInfo.storeName,
    companyName: storeInfo.storeName,
    adminName: storeInfo.ownerName,
    ownerName: storeInfo.ownerName,
    products: [{
      id: item.id,
      productId: item.productId?.toString(),
      productName: item.product?.name || item.productName || 'Product',
      quantity: item.quantity,
      unitPrice: item.pricePerUnit,
      totalAmount: item.totalAmount,
    }],
    totalAmount: item.totalAmount,
    amountPaid: 0,
    paidAmount: 0,
    balanceDue: item.totalAmount,
    status: 'UNPAID',
    pdfUrl: null,
    paymentSettings: publicPaymentSettings(settings),
  };
};

const toFarmerInvoiceRow = (invoice, settings = null) => ({
  id: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  invoiceDate: invoice.invoiceDate,
  storeId: getStoreFallback(invoice).storeId,
  adminId: getStoreFallback(invoice).adminId,
  storeName: getStoreFallback(invoice).storeName,
  shopName: getStoreFallback(invoice).storeName,
  companyName: getStoreFallback(invoice).storeName,
  adminName: getStoreFallback(invoice).ownerName,
  ownerName: getStoreFallback(invoice).ownerName,
  products: (invoice.items || []).map((item) => ({
    id: item.id,
    productId: item.productId?.toString(),
    productName: item.product?.name || item.productName || 'Product',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalAmount: item.lineTotal ?? item.totalPrice,
  })),
  totalAmount: invoice.totalAmount,
  amountPaid: invoice.paidAmount,
  paidAmount: invoice.paidAmount,
  balanceDue: invoice.balanceDue,
  status: invoice.status,
  pdfUrl: invoice.pdfUrl,
  paymentSettings: publicPaymentSettings(settings),
});

const getSettingsForInvoices = async (invoices) => {
  const filters = invoices
    .map((invoice) => {
      const adminId = asId(invoice.adminId);
      const storeId = asId(invoice.storeId);
      return adminId ? { adminId, ...(storeId ? { storeId } : {}) } : null;
    })
    .filter(Boolean);
  if (filters.length === 0) return new Map();
  const settingsRows = await Settings.find({ $or: filters });
  const map = new Map();
  settingsRows.forEach((settings) => {
    map.set(`${asId(settings.adminId)}:${asId(settings.storeId) || ''}`, settings);
  });
  return map;
};

const findInvoiceSettings = (settingsMap, invoice) => (
  settingsMap.get(`${asId(invoice.adminId)}:${asId(invoice.storeId) || ''}`) ||
  settingsMap.get(`${asId(invoice.adminId)}:`) ||
  null
);

const publicProduct = (product) => {
  const stock = Number(product.stockQuantity ?? product.currentStock ?? 0);
  const low = Number(product.lowStockAlert ?? product.minimumStock ?? 0);
  return {
    id: product.id,
    name: product.name,
    productName: product.name,
    brandName: product.brandName || product.brand || '',
    brand: product.brandName || product.brand || '',
    category: product.category,
    npkRatio: product.npkRatio,
    availableStock: stock,
    stockQuantity: stock,
    unitType: product.unitType || product.unit,
    sellingPrice: Number(product.pricePerUnit ?? product.sellingPrice ?? 0),
    pricePerUnit: Number(product.pricePerUnit ?? product.sellingPrice ?? 0),
    gstRate: Number(product.gstRate ?? product.gstPercentage ?? 0),
    expiryDate: product.expiryDate,
    pesticideWeight: product.pesticideWeight,
    pesticideWeightUnit: product.pesticideWeightUnit,
    stockStatus: stock <= 0 ? 'OUT_OF_STOCK' : stock <= low ? 'LOW_STOCK' : 'IN_STOCK',
  };
};

export const getDashboard = async (req, res) => {
  try {
    const invoiceFilter = await getFarmerInvoiceFilter(req);
    const invoices = await Invoice.find(invoiceFilter)
      .sort({ invoiceDate: -1 })
      .populate('items.product')
      .populate('storeId')
      .populate('adminId');
    const pendingAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
    const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const stores = new Set(invoices.map((invoice) => invoice.storeId?.id || invoice.storeId?.toString()).filter(Boolean));

    const settingsMap = await getSettingsForInvoices(invoices);

    res.json({
      success: true,
      data: {
        totalPurchases: invoices.length,
        totalInvoices: invoices.length,
        totalAmount,
        pendingAmount,
        creditBalance: 0,
        shopCount: stores.size,
        recentInvoices: invoices.slice(0, 5).map((invoice) => toFarmerInvoiceRow(invoice, findInvoiceSettings(settingsMap, invoice))),
      },
    });
  } catch (error) {
    console.error('Get farmer dashboard error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const invoiceFilter = await getFarmerInvoiceFilter(req);
    const invoices = await Invoice.find(invoiceFilter)
      .sort({ invoiceDate: -1 })
      .populate('items.product')
      .populate('storeId')
      .populate('adminId');
    const settingsMap = await getSettingsForInvoices(invoices);
    res.json({ success: true, data: invoices.map((invoice) => toFarmerInvoiceRow(invoice, findInvoiceSettings(settingsMap, invoice))) });
  } catch (error) {
    console.error('List farmer invoices error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listShops = async (req, res) => {
  try {
    const invoiceFilter = await getFarmerInvoiceFilter(req);
    const customerIds = await getFarmerCustomerIds(req.user.userId);
    const isUserIdValid = mongoose.Types.ObjectId.isValid(req.user.userId);
    const [invoices, manualItems, allStores, farmerUser] = await Promise.all([
      Invoice.find(invoiceFilter).populate('storeId').populate('adminId'),
      customerIds.length > 0
        ? CustomerPurchasedItem.find({ customerId: { $in: customerIds }, $or: [{ invoiceId: { $exists: false } }, { invoiceId: null }] }).populate('storeId').populate('adminId')
        : [],
      Store.find().populate('ownerAdminId'),
      isUserIdValid ? User.findById(req.user.userId) : null,
    ]);

    const shops = new Map();
    
    // Initialize map with all stores
    allStores.forEach((store) => {
      const storeId = store._id.toString();
      const admin = store.ownerAdminId;
      let proximityScore = 0;
      let matchType = null;

      if (farmerUser) {
        if (store.village && farmerUser.village && store.village.toLowerCase() === farmerUser.village.toLowerCase()) {
          proximityScore = 5;
          matchType = 'village';
        } else if (store.taluk && farmerUser.taluk && store.taluk.toLowerCase() === farmerUser.taluk.toLowerCase()) {
          proximityScore = 4;
          matchType = 'taluk';
        } else if (store.district && farmerUser.district && store.district.toLowerCase() === farmerUser.district.toLowerCase()) {
          proximityScore = 3;
          matchType = 'district';
        } else if (store.state && farmerUser.state && store.state.toLowerCase() === farmerUser.state.toLowerCase()) {
          proximityScore = 2;
          matchType = 'state';
        }
      }

      shops.set(storeId, {
        id: storeId,
        storeId,
        adminId: admin?._id?.toString(),
        shopName: store.name,
        storeName: store.name,
        companyName: store.name,
        name: store.name,
        ownerName: store.ownerName || admin?.name || '',
        phone: store.mobileNumber || admin?.mobileNumber || '',
        address: store.address || '',
        totalInvoices: 0,
        totalPurchaseAmount: 0,
        totalAmountSpent: 0,
        totalPaid: 0,
        paidAmount: 0,
        totalBalance: 0,
        pendingBalance: 0,
        lastPurchaseDate: null,
        isNear: proximityScore > 0,
        proximityScore,
        matchType,
        hasPurchases: false,
      });
    });

    invoices.forEach((invoice) => {
      const storeInfo = getStoreFallback(invoice);
      const storeId = storeInfo.storeId;
      if (!storeId) return;
      
      let existing = shops.get(storeId);
      if (!existing) {
        existing = {
          id: storeId,
          storeId,
          adminId: storeInfo.adminId,
          shopName: storeInfo.storeName,
          storeName: storeInfo.storeName,
          companyName: storeInfo.storeName,
          name: storeInfo.storeName,
          ownerName: storeInfo.ownerName,
          phone: storeInfo.phone,
          address: storeInfo.address,
          totalInvoices: 0,
          totalPurchaseAmount: 0,
          totalAmountSpent: 0,
          totalPaid: 0,
          paidAmount: 0,
          totalBalance: 0,
          pendingBalance: 0,
          lastPurchaseDate: invoice.invoiceDate,
          isNear: false,
          hasPurchases: true,
        };
        shops.set(storeId, existing);
      }
      existing.totalInvoices += 1;
      existing.totalPurchaseAmount += Number(invoice.totalAmount || 0);
      existing.totalAmountSpent += Number(invoice.totalAmount || 0);
      existing.totalPaid += Number(invoice.paidAmount || 0);
      existing.paidAmount += Number(invoice.paidAmount || 0);
      existing.totalBalance += Number(invoice.balanceDue || 0);
      existing.pendingBalance += Number(invoice.balanceDue || 0);
      existing.hasPurchases = true;
      if (!existing.lastPurchaseDate || invoice.invoiceDate > existing.lastPurchaseDate) {
        existing.lastPurchaseDate = invoice.invoiceDate;
      }
    });

    manualItems.forEach((item) => {
      const storeInfo = getStoreFallback(item);
      const storeId = storeInfo.storeId;
      if (!storeId) return;

      let existing = shops.get(storeId);
      if (!existing) {
        existing = {
          id: storeId,
          storeId,
          adminId: storeInfo.adminId,
          shopName: storeInfo.storeName,
          storeName: storeInfo.storeName,
          companyName: storeInfo.storeName,
          name: storeInfo.storeName,
          ownerName: storeInfo.ownerName,
          phone: storeInfo.phone,
          address: storeInfo.address,
          totalInvoices: 0,
          totalPurchaseAmount: 0,
          totalAmountSpent: 0,
          totalPaid: 0,
          paidAmount: 0,
          totalBalance: 0,
          pendingBalance: 0,
          lastPurchaseDate: item.purchaseDate,
          isNear: false,
          hasPurchases: true,
        };
        shops.set(storeId, existing);
      }
      existing.totalInvoices += 1;
      existing.totalPurchaseAmount += Number(item.totalAmount || 0);
      existing.totalAmountSpent += Number(item.totalAmount || 0);
      existing.totalBalance += Number(item.totalAmount || 0);
      existing.pendingBalance += Number(item.totalAmount || 0);
      existing.hasPurchases = true;
      if (!existing.lastPurchaseDate || item.purchaseDate > existing.lastPurchaseDate) {
        existing.lastPurchaseDate = item.purchaseDate;
      }
    });

    const shopList = Array.from(shops.values()).sort((a, b) => {
      const scoreA = a.proximityScore || 0;
      const scoreB = b.proximityScore || 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return b.totalPurchaseAmount - a.totalPurchaseAmount || a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: shopList });
  } catch (error) {
    console.error('List farmer shops error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listShopInvoices = async (req, res) => {
  try {
    const { storeId } = req.params;
    const invoiceFilter = await getFarmerInvoiceFilter(req, { storeId });
    const customerIds = await getFarmerCustomerIds(req.user.userId);
    const [invoices, manualItems] = await Promise.all([
      Invoice.find(invoiceFilter)
        .sort({ invoiceDate: -1 })
        .populate('items.product')
        .populate('storeId')
        .populate('adminId'),
      customerIds.length > 0
        ? CustomerPurchasedItem.find({
            customerId: { $in: customerIds },
            storeId,
            $or: [{ invoiceId: { $exists: false } }, { invoiceId: null }],
          }).sort({ purchaseDate: -1 }).populate('product').populate('storeId').populate('adminId')
        : [],
    ]);

    if (invoices.length === 0 && manualItems.length === 0) {
      return res.status(403).json({ success: false, message: 'Store access denied' });
    }

    const settingsMap = await getSettingsForInvoices([...invoices, ...manualItems]);
    res.json({
      success: true,
      data: [
        ...invoices.map((invoice) => toFarmerInvoiceRow(invoice, findInvoiceSettings(settingsMap, invoice))),
        ...manualItems.map((item) => toManualInvoiceRow(item, findInvoiceSettings(settingsMap, item))),
      ],
    });
  } catch (error) {
    console.error('List farmer shop invoices error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listShopProducts = async (req, res) => {
  try {
    const { storeId } = req.params;

    const search = String(req.query.search || '').trim();
    const filter = { storeId };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { brandName: regex }, { brand: regex }, { npkRatio: regex }];
    }
    if (req.query.category && req.query.category !== 'ALL') filter.category = req.query.category;

    const products = await Product.find(filter).sort({ name: 1 });
    res.json({ success: true, data: products.map(publicProduct) });
  } catch (error) {
    console.error('List farmer shop products error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId || req.params.id;
    const invoiceFilter = await getFarmerInvoiceFilter(req, { _id: invoiceId });
    const invoice = await Invoice.findOne(invoiceFilter)
      .populate('items.product')
      .populate('storeId')
      .populate('adminId')
      .populate('customer');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const settingsMap = await getSettingsForInvoices([invoice]);
    const paymentSettings = findInvoiceSettings(settingsMap, invoice);
    res.json({ success: true, data: { ...invoice.toJSON(), paymentSettings: publicPaymentSettings(paymentSettings), farmerView: toFarmerInvoiceRow(invoice, paymentSettings) } });
  } catch (error) {
    console.error('Get farmer invoice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listPurchases = async (req, res) => {
  try {
    const profile = await getFarmerCustomer(req);
    if (!profile) return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    const { customer, storeId } = profile;
    const filter = { customerId: customer._id, ...(storeId ? { storeId } : {}) };
    if (req.query.category && req.query.category !== 'ALL') filter.category = req.query.category;
    const items = await CustomerPurchasedItem.find(filter).sort({ purchaseDate: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('List farmer purchases error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCredit = async (req, res) => {
  try {
    const profile = await getFarmerCustomer(req);
    if (!profile) return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    const { customer } = profile;
    const pendingAmount = Number(customer.totalCredit || 0);
    res.json({
      success: true,
      data: {
        creditLimit: Number(customer.creditLimit || 0),
        currentCreditUsed: pendingAmount,
        remainingCredit: Math.max(Number(customer.creditLimit || 0) - pendingAmount, 0),
        creditStatus: pendingAmount >= Number(customer.creditLimit || 0) && Number(customer.creditLimit || 0) > 0 ? 'BLOCKED' : 'AVAILABLE',
      },
    });
  } catch (error) {
    console.error('Get farmer credit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const stockStatus = (product) => {
  const stock = Number(product.stockQuantity ?? product.currentStock ?? 0);
  const low = Number(product.lowStockAlert ?? product.minimumStock ?? 0);
  if (stock <= 0) return 'OUT_OF_STOCK';
  return stock <= low ? 'LOW_STOCK' : 'IN_STOCK';
};

export const listCatalog = async (req, res) => {
  try {
    const storeId = req.headers['x-store-id'] || req.user.storeId;
    if (!storeId) return res.status(400).json({ success: false, message: 'Store context is required' });
    const search = String(req.query.search || '').trim();
    const filter = { storeId };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { brandName: regex }, { npkRatio: regex }];
    }
    if (req.query.category && req.query.category !== 'ALL') filter.category = req.query.category;
    const [products, wishlist] = await Promise.all([
      Product.find(filter).sort({ name: 1 }),
      WishlistItem.find({ farmerId: req.user.userId, storeId }),
    ]);
    const wished = new Set(wishlist.map((item) => item.productId.toString()));
    res.json({
      success: true,
      data: products.map((product) => ({ ...publicProduct(product), wished: wished.has(product.id) })),
    });
  } catch (error) {
    console.error('List farmer catalog error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const storeId = req.headers['x-store-id'] || req.user.storeId;
    const filter = { farmerId: req.user.userId, storeId, productId: req.params.productId };
    const existing = await WishlistItem.findOne(filter);
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, data: { wished: false } });
    }
    await WishlistItem.create(filter);
    res.status(201).json({ success: true, data: { wished: true } });
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const requestAvailability = async (req, res) => {
  try {
    const storeId = req.headers['x-store-id'] || req.user.storeId;
    await AvailabilityRequest.findOneAndUpdate(
      { farmerId: req.user.userId, storeId, productId: req.params.productId },
      {},
      { upsert: true, returnDocument: 'after' }
    );
    res.status(201).json({ success: true, message: 'Availability notification requested' });
  } catch (error) {
    console.error('Request availability error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
