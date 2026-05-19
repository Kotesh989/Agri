import { Customer, CustomerPurchasedItem, FarmerStoreLink, Invoice, Payment, Product, Settings, StockMovement, Store, User } from '../models/index.js';
import { hashPassword } from '../utils/password.js';
import { getOwnerFilter, getRequestAdminId, ownedDocument } from '../utils/ownership.js';
import { getRequestStoreId } from '../utils/ownership.js';
import crypto from 'node:crypto';

const searchRegex = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const pesticideCategories = new Set(['PESTICIDE', 'INSECTICIDE', 'HERBICIDE', 'FUNGICIDE']);

const normalizeProductCategory = (category) => {
  const normalized = String(category || 'FERTILIZER').trim().toUpperCase();
  return pesticideCategories.has(normalized) ? 'PESTICIDE' : 'FERTILIZER';
};

const buildCustomerPurchaseHistory = async (customerId, category, adminId, storeId) => {
  const requestedCategory = category ? normalizeProductCategory(category) : null;
  const invoices = await Invoice.find({ customerId, ...(adminId ? { adminId } : {}), ...(storeId ? { storeId } : {}) })
    .sort({ invoiceDate: -1 })
    .populate('items.product');

  return invoices.flatMap((invoice) =>
    invoice.items
      .map((item) => {
        const productCategory = normalizeProductCategory(item.product?.category);
        return {
          id: item.id || item._id?.toString(),
          invoiceId: invoice.id || invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          productId: item.productId?.toString(),
          productName: item.product?.name || 'Unknown product',
          category: productCategory,
          quantity: Number(item.quantity || 0),
          pricePerQuantity: Number(item.unitPrice || 0),
          totalCost: Number(item.lineTotal ?? item.totalPrice ?? 0),
          purchaseDate: invoice.invoiceDate,
        };
      })
      .filter((purchase) => !requestedCategory || purchase.category === requestedCategory)
  );
};

const summarizePurchases = (purchases) => {
  const baseSummary = {
    quantity: 0,
    amount: 0,
    items: 0,
  };

  return purchases.reduce(
    (summary, purchase) => {
      const categoryKey = purchase.category === 'PESTICIDE' ? 'pesticides' : 'fertilizers';
      summary.totalPurchases += 1;
      summary.totalAmountSpent += purchase.totalCost;
      summary[categoryKey].quantity += purchase.quantity;
      summary[categoryKey].amount += purchase.totalCost;
      summary[categoryKey].items += 1;
      return summary;
    },
    {
      totalPurchases: 0,
      totalAmountSpent: 0,
      fertilizers: { ...baseSummary },
      pesticides: { ...baseSummary },
      recentPurchases: purchases.slice(0, 5),
    }
  );
};

const buildPurchasedItemPayload = (body) => {
  const quantity = Number(body.quantity || 0);
  const pricePerUnit = Number(body.pricePerUnit || 0);
  const category = normalizeProductCategory(body.category);
  const pesticideWeight = body.pesticideWeight === '' || body.pesticideWeight === undefined
    ? undefined
    : Number(body.pesticideWeight);

  return {
    productId: body.productId,
    productName: String(body.productName || '').trim(),
    category,
    quantity,
    unitType: String(body.unitType || '').trim(),
    pricePerUnit,
    totalAmount: Number((quantity * pricePerUnit).toFixed(2)),
    pesticideWeight: category === 'PESTICIDE' ? pesticideWeight : undefined,
    pesticideWeightUnit: category === 'PESTICIDE' ? body.pesticideWeightUnit : undefined,
    purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
    notes: body.notes,
  };
};

const validatePurchasedItemPayload = (payload) => {
  if (!payload.productId) return 'Please select a product';
  if (!payload.productName) return 'Product name is required';
  if (!['FERTILIZER', 'PESTICIDE'].includes(payload.category)) return 'Valid category is required';
  if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) return 'Quantity must be greater than zero';
  if (!payload.unitType) return 'Unit type is required';
  if (!Number.isFinite(payload.pricePerUnit) || payload.pricePerUnit < 0) return 'Price per unit must be zero or greater';
  if (payload.category === 'PESTICIDE') {
    if (!Number.isFinite(payload.pesticideWeight) || payload.pesticideWeight <= 0) return 'Pesticide weight is required';
    if (!['Gram', 'Kg', 'ML', 'Litre'].includes(payload.pesticideWeightUnit)) return 'Valid pesticide weight unit is required';
  }
  if (Number.isNaN(payload.purchaseDate.getTime())) return 'Valid purchase date is required';
  return null;
};

const applyProductDefaultsToPurchase = (payload, product) => ({
  ...payload,
  productName: product.name,
  category: normalizeProductCategory(product.category),
  unitType: product.unitType || product.unit,
  pricePerUnit: Number(product.pricePerUnit ?? product.sellingPrice ?? 0),
  totalAmount: Number((payload.quantity * Number(product.pricePerUnit ?? product.sellingPrice ?? 0)).toFixed(2)),
  pesticideWeight: normalizeProductCategory(product.category) === 'PESTICIDE'
    ? payload.pesticideWeight ?? product.pesticideWeight
    : undefined,
  pesticideWeightUnit: normalizeProductCategory(product.category) === 'PESTICIDE'
    ? payload.pesticideWeightUnit || product.pesticideWeightUnit
    : undefined,
});

const summarizePurchasedItems = (items) =>
  items.reduce(
    (summary, item) => {
      if (item.category === 'PESTICIDE') {
        summary.totalPesticidePurchases += 1;
      } else {
        summary.totalFertilizerPurchases += 1;
      }
      summary.totalQuantityBought += Number(item.quantity || 0);
      summary.totalAmountSpent += Number(item.totalAmount || 0);
      return summary;
    },
    {
      totalFertilizerPurchases: 0,
      totalPesticidePurchases: 0,
      totalQuantityBought: 0,
      totalAmountSpent: 0,
    }
  );

const getCreditSnapshot = (customer) => {
  const currentCreditUsed = Number(customer.totalCredit || 0);
  const creditLimit = Number(customer.creditLimit || 0);
  const remainingCredit = Math.max(creditLimit - currentCreditUsed, 0);
  return {
    currentCreditUsed,
    remainingCredit,
    creditStatus: currentCreditUsed >= creditLimit && creditLimit > 0 ? 'BLOCKED' : 'AVAILABLE',
  };
};

const ensureCustomerFarmerUser = async (customer) => {
  if (customer.farmerUserId) return customer.farmerUserId;
  let farmer = await User.findOne({ role: 'FARMER', mobileNumber: customer.mobileNumber });
  if (!farmer) {
    farmer = await User.create({
      email: customer.email || undefined,
      mobileNumber: customer.mobileNumber,
      password: await hashPassword(crypto.randomBytes(24).toString('hex')),
      name: customer.name,
      role: 'FARMER',
      isPhoneVerified: false,
    });
  }
  customer.farmerUserId = farmer._id;
  await customer.save();
  return farmer._id;
};

const buildStoreSnapshot = async (req) => {
  const [settings, store, admin] = await Promise.all([
    Settings.findOne(getOwnerFilter(req)),
    Store.findOne({ _id: getRequestStoreId(req), ownerAdminId: getRequestAdminId(req) }),
    User.findById(getRequestAdminId(req)),
  ]);
  return {
    storeName: settings?.companyName || settings?.shopName || store?.name || admin?.businessName || admin?.name || 'Unknown Store',
    ownerName: settings?.ownerName || store?.ownerName || admin?.ownerName || admin?.name || '',
    phone: settings?.companyPhone || settings?.shopPhone || store?.mobileNumber || admin?.mobileNumber || '',
    address: settings?.companyAddress || settings?.shopAddress || store?.address || admin?.businessAddress || '',
  };
};

export const createCustomer = async (req, res) => {
  try {
    const { name, mobileNumber, email, address, city, village, taluk, district, state, pinCode, aadhaarNumber, creditLimit, password } = req.body;

    if (!name || !mobileNumber) {
      return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
    }

    const adminId = getRequestAdminId(req);
    const storeId = getRequestStoreId(req);
    const normalizedMobileNumber = String(mobileNumber).trim();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;
    const existingCustomer = await Customer.findOne({ adminId, storeId, mobileNumber: normalizedMobileNumber });
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: 'Customer with this mobile number already exists in this shop' });
    }

    const existingUserByEmail = normalizedEmail ? await User.findOne({ email: normalizedEmail }) : null;
    if (existingUserByEmail && existingUserByEmail.role !== 'FARMER') {
      return res.status(400).json({ success: false, message: 'This email is already used by an admin account. Use the farmer email or leave email blank.' });
    }

    let farmer = await User.findOne({
      role: 'FARMER',
      $or: [
        { mobileNumber: normalizedMobileNumber },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    });
    const linkedExistingFarmer = Boolean(farmer);
    if (!farmer) {
      farmer = await User.create({
        email: normalizedEmail,
        mobileNumber: normalizedMobileNumber,
        password: password ? await hashPassword(password) : await hashPassword(crypto.randomBytes(24).toString('hex')),
        name,
        role: 'FARMER',
        isPhoneVerified: false,
      });
    } else {
      if (!farmer.email && normalizedEmail) farmer.email = normalizedEmail;
      if (!farmer.mobileNumber && normalizedMobileNumber) farmer.mobileNumber = normalizedMobileNumber;
      if (password) farmer.password = await hashPassword(password);
      await farmer.save();
    }

    const customer = await Customer.create({
      farmerUserId: farmer._id,
      adminId,
      storeId,
      name,
      mobileNumber: normalizedMobileNumber,
      email: normalizedEmail,
      address,
      city,
      village,
      taluk,
      district,
      state,
      pinCode,
      aadhaarNumber,
      creditLimit: Number(creditLimit || 0),
    });
    await FarmerStoreLink.findOneAndUpdate(
      { farmerId: farmer._id, storeId },
      { customerId: customer._id, lastVisitDate: new Date() },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: linkedExistingFarmer ? 'Existing farmer account linked to this shop.' : 'Farmer account created successfully',
      data: customer,
      linkedExistingFarmer,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Farmer account with this phone number already exists' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listCustomers = async (req, res) => {
  try {
    const filter = getOwnerFilter(req);
    if (req.query.search) {
      const regex = searchRegex(req.query.search);
      filter.$or = [{ name: regex }, { mobileNumber: regex }, { email: regex }];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: customers.map((customer) => ({ ...customer.toJSON(), ...getCreditSnapshot(customer) })),
    });
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomer = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const [invoices, payments] = await Promise.all([
      Invoice.find(getOwnerFilter(req, { customerId: customer._id })),
      Payment.find(getOwnerFilter(req, { customerId: customer._id })),
    ]);

    res.json({ success: true, data: { ...customer.toJSON(), ...getCreditSnapshot(customer), invoices, payments } });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerPurchaseHistory = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const purchases = await buildCustomerPurchaseHistory(customer._id, req.query.category, getRequestAdminId(req), getRequestStoreId(req));
    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Get customer purchase history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerSpendingSummary = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const purchases = await buildCustomerPurchaseHistory(customer._id, undefined, getRequestAdminId(req), getRequestStoreId(req));
    res.json({ success: true, data: summarizePurchases(purchases) });
  } catch (error) {
    console.error('Get customer spending summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addCustomerPurchasedItem = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let payload = buildPurchasedItemPayload(req.body);
    const product = payload.productId ? await ownedDocument(Product, req, payload.productId) : null;
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    payload = applyProductDefaultsToPurchase(payload, product);
    const validationError = validatePurchasedItemPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    if (Number(product.stockQuantity ?? product.currentStock ?? 0) < payload.quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock for this item' });
    }
    const gstRate = Number(product.gstRate ?? product.gstPercentage ?? 0);
    const taxableAmount = Number(payload.totalAmount || 0);
    const gstAmount = Number((taxableAmount * (gstRate / 100)).toFixed(2));
    const invoiceTotalAmount = Number((taxableAmount + gstAmount).toFixed(2));
    const amountPaid = Number(req.body.amountPaid || 0);
    const balanceDue = Number((invoiceTotalAmount - amountPaid).toFixed(2));
    if (amountPaid < 0 || balanceDue < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot exceed invoice total' });
    }

    const projectedCredit = Number(customer.totalCredit || 0) + balanceDue;
    const creditLimit = Number(customer.creditLimit || 0);
    if (creditLimit > 0 && projectedCredit > creditLimit && !req.body.overrideCreditLimit) {
      return res.status(400).json({ success: false, message: 'Credit limit reached. Contact Admin.' });
    }
    if (req.body.overrideCreditLimit && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only admin can override credit limit' });
    }

    const purchasedItem = await CustomerPurchasedItem.create({
      ...payload,
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      customerId: customer._id,
    });
    const previousStock = Number(product.stockQuantity ?? product.currentStock ?? 0);
    product.stockQuantity = previousStock - payload.quantity;
    product.currentStock = product.stockQuantity;
    await product.save();
    const farmerUserId = await ensureCustomerFarmerUser(customer);
    const invoicePaidAmount = Number(req.body.amountPaid || 0);
    const invoiceBalanceDue = Number((invoiceTotalAmount - invoicePaidAmount).toFixed(2));

    if (invoicePaidAmount < 0 || invoiceBalanceDue < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot exceed invoice total' });
    }

    const invoice = await Invoice.create({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      farmerUserId,
      invoiceNumber: `INV-${Date.now()}`,
      customerId: customer._id,
      storeSnapshot: await buildStoreSnapshot(req),
      customerSnapshot: {
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        email: customer.email,
        village: customer.village,
        gstNumber: customer.gstNumber,
      },
      invoiceDate: payload.purchaseDate,
      totalQuantity: payload.quantity,
      subtotal: taxableAmount,
      gstAmount,
      totalAmount: invoiceTotalAmount,
      amountPaid: invoicePaidAmount,
      paidAmount: invoicePaidAmount,
      balanceDue: invoiceBalanceDue,
      dueAmount: invoiceBalanceDue,
      paymentStatus: invoicePaidAmount >= invoiceTotalAmount ? 'PAID' : invoicePaidAmount > 0 ? 'PARTIAL' : 'PENDING',
      paidAt: invoicePaidAmount >= invoiceTotalAmount ? new Date() : undefined,
      status: invoicePaidAmount >= invoiceTotalAmount ? 'PAID' : invoicePaidAmount > 0 ? 'PARTIAL' : 'PENDING',
      paymentMethod: req.body.paymentMethod || 'CREDIT',
      notes: payload.notes,
      items: [{
        productId: product._id,
        productName: product.name,
        quantity: payload.quantity,
        unit: payload.unitType,
        unitPrice: payload.pricePerUnit,
        sellingPrice: payload.pricePerUnit,
        totalPrice: taxableAmount,
        subtotal: taxableAmount,
        gstPercentage: gstRate,
        gstRate,
        gstAmount,
        lineTotal: invoiceTotalAmount,
        total: invoiceTotalAmount,
      }],
    });

    await StockMovement.create({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      productId: product._id,
      type: 'SALE_OUT',
      referenceType: 'INVOICE',
      referenceId: invoice._id,
      quantity: -Math.abs(payload.quantity),
      previousStock,
      newStock: product.stockQuantity,
      note: `Sale invoice ${invoice.invoiceNumber}`,
    });

    if (invoicePaidAmount > 0) {
      await Payment.create({
        adminId: getRequestAdminId(req),
        storeId: getRequestStoreId(req),
        invoiceId: invoice._id,
        customerId: customer._id,
        amount: invoicePaidAmount,
        paymentMethod: req.body.paymentMethod || 'CASH',
        notes: req.body.paymentNotes,
      });
    }

    customer.totalCredit = Number(customer.totalCredit || 0) + invoiceBalanceDue;
    customer.totalPurchases = Number(customer.totalPurchases || 0) + invoiceTotalAmount;
    customer.lastPurchaseDate = payload.purchaseDate;
    await customer.save();

    res.status(201).json({ success: true, message: 'Purchased item and invoice added successfully', data: { purchasedItem, invoice } });
  } catch (error) {
    console.error('Add customer purchased item error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listCustomerPurchasedItems = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const baseFilter = getOwnerFilter(req, { customerId: customer._id });
    const filter = { ...baseFilter };
    if (req.query.category && req.query.category !== 'ALL') {
      filter.category = normalizeProductCategory(req.query.category);
    }

    const [items, allItems] = await Promise.all([
      CustomerPurchasedItem.find(filter).sort({ purchaseDate: -1, createdAt: -1 }),
      CustomerPurchasedItem.find(baseFilter),
    ]);
    res.json({ success: true, data: items, summary: summarizePurchasedItems(allItems) });
  } catch (error) {
    console.error('List customer purchased items error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listAllCustomerPurchasedItems = async (req, res) => {
  try {
    const filter = getOwnerFilter(req);
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.category && req.query.category !== 'ALL') filter.category = normalizeProductCategory(req.query.category);
    const items = await CustomerPurchasedItem.find(filter)
      .populate('customer')
      .populate('product')
      .sort({ purchaseDate: -1, createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('List all customer purchased items error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateCustomerPurchasedItem = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    let payload = buildPurchasedItemPayload(req.body);
    const nextProduct = payload.productId ? await ownedDocument(Product, req, payload.productId) : null;
    if (!nextProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    payload = applyProductDefaultsToPurchase(payload, nextProduct);
    const validationError = validatePurchasedItemPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const purchasedItem = await CustomerPurchasedItem.findOne(getOwnerFilter(req, { _id: req.params.itemId, customerId: req.params.id }));
    if (!purchasedItem) {
      return res.status(404).json({ success: false, message: 'Purchased item not found' });
    }

    const previousProduct = await ownedDocument(Product, req, purchasedItem.productId);
    const nextCredit = Number(customer.totalCredit || 0) - Number(purchasedItem.totalAmount || 0) + payload.totalAmount;
    const creditLimit = Number(customer.creditLimit || 0);
    if (creditLimit > 0 && nextCredit > creditLimit && !req.body.overrideCreditLimit) {
      return res.status(400).json({ success: false, message: 'Credit limit reached. Contact Admin.' });
    }
    if (req.body.overrideCreditLimit && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only admin can override credit limit' });
    }
    if (String(purchasedItem.productId) === String(payload.productId)) {
      const quantityIncrease = payload.quantity - purchasedItem.quantity;
      const availableStock = Number(nextProduct.stockQuantity ?? nextProduct.currentStock ?? 0);
      if (quantityIncrease > 0 && availableStock < quantityIncrease) {
        return res.status(400).json({ success: false, message: 'Insufficient stock for this update' });
      }
      nextProduct.stockQuantity = availableStock - quantityIncrease;
      nextProduct.currentStock = nextProduct.stockQuantity;
      await nextProduct.save();
    } else {
      const nextAvailableStock = Number(nextProduct.stockQuantity ?? nextProduct.currentStock ?? 0);
      if (nextAvailableStock < payload.quantity) {
        return res.status(400).json({ success: false, message: 'Insufficient stock for this item' });
      }
      if (previousProduct) {
        previousProduct.stockQuantity = Number(previousProduct.stockQuantity ?? previousProduct.currentStock ?? 0) + purchasedItem.quantity;
        previousProduct.currentStock = previousProduct.stockQuantity;
        await previousProduct.save();
      }
      nextProduct.stockQuantity = nextAvailableStock - payload.quantity;
      nextProduct.currentStock = nextProduct.stockQuantity;
      await nextProduct.save();
    }

    Object.assign(purchasedItem, payload);
    await purchasedItem.save();
    customer.totalCredit = nextCredit;
    await customer.save();

    res.json({ success: true, message: 'Purchased item updated successfully', data: purchasedItem });
  } catch (error) {
    console.error('Update customer purchased item error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteCustomerPurchasedItem = async (req, res) => {
  try {
    const purchasedItem = await CustomerPurchasedItem.findOneAndDelete(getOwnerFilter(req, {
      _id: req.params.itemId,
      customerId: req.params.id,
    }));

    if (!purchasedItem) {
      return res.status(404).json({ success: false, message: 'Purchased item not found' });
    }

    const product = await ownedDocument(Product, req, purchasedItem.productId);
    if (product) {
      product.stockQuantity = Number(product.stockQuantity ?? product.currentStock ?? 0) + purchasedItem.quantity;
      product.currentStock = product.stockQuantity;
      await product.save();
    }
    await Customer.findOneAndUpdate(getOwnerFilter(req, { _id: req.params.id }), { $inc: { totalCredit: -Number(purchasedItem.totalAmount || 0) } });

    res.json({ success: true, message: 'Purchased item deleted successfully' });
  } catch (error) {
    console.error('Delete customer purchased item error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    Object.entries(req.body).forEach(([key, value]) => {
      if (key === 'password') return;
      if (value === undefined || value === '') return;
      customer[key] = key === 'creditLimit' ? Number(value) : value;
    });
    await customer.save();

    if (customer.farmerUserId && (req.body.email || req.body.password)) {
      const farmer = await User.findOne({ _id: customer.farmerUserId, role: 'FARMER' });
      if (farmer) {
        if (req.body.email) farmer.email = String(req.body.email).trim().toLowerCase();
        if (req.body.password) farmer.password = await hashPassword(req.body.password);
        await farmer.save();
      }
    }

    res.json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const resetCustomerPendingAmount = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.totalCredit = 0;
    await customer.save();
    res.json({ success: true, message: 'Pending amount reset successfully', data: { ...customer.toJSON(), ...getCreditSnapshot(customer) } });
  } catch (error) {
    console.error('Reset customer pending amount error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete(getOwnerFilter(req, { _id: req.params.id }));
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    await CustomerPurchasedItem.deleteMany(getOwnerFilter(req, { customerId: customer._id }));
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
