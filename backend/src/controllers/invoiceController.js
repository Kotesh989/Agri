import crypto from 'node:crypto';
import { Customer, CustomerPurchasedItem, Invoice, Payment, Product, Settings, Notification, StockMovement, Store, User } from '../models/index.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import { uploadFile } from '../utils/supabase.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId, ownedDocument } from '../utils/ownership.js';
import { hashPassword } from '../utils/password.js';

const populateInvoice = (query) =>
  query.populate('customer').populate('items.product');

export const createInvoice = async (req, res) => {
  try {
    const {
      customerId,
      items,
      paymentMethod,
      notes,
      discount = 0,
      roundOff = 0,
      amountPaid = 0,
      dueDate,
      referenceNumber,
      paymentNotes,
    } = req.body;

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer and items are required' });
    }

    const customer = await ownedDocument(Customer, req, customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!customer.farmerUserId) {
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
    }

    const [settings, store, admin] = await Promise.all([
      Settings.findOne(getOwnerFilter(req)),
      Store.findOne({ _id: getRequestStoreId(req), ownerAdminId: getRequestAdminId(req) }),
      User.findById(getRequestAdminId(req)),
    ]);
    const invoiceNumber = `${settings?.invoicePrefix || 'INV'}-${Date.now()}`;

    let totalQuantity = 0;
    let subtotal = 0;
    let totalGstAmount = 0;

    const invoiceItems = [];
    const stockUpdates = [];
    for (const item of items) {
      const product = await ownedDocument(Product, req, item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for product ${product.name}` });
      }

      const unitPrice = Number(item.unitPrice ?? product.pricePerUnit ?? product.sellingPrice ?? 0);
      const totalPrice = quantity * unitPrice;
      const gstRate = Number(item.gstPercentage ?? item.gstRate ?? product.gstRate ?? product.gstPercentage ?? 0);
      const itemGstAmount = totalPrice * (gstRate / 100);
      const lineTotal = totalPrice + itemGstAmount;

      const availableStock = Number(product.stockQuantity ?? product.currentStock ?? 0);
      if (availableStock < quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }

      totalQuantity += quantity;
      subtotal += totalPrice;
      totalGstAmount += itemGstAmount;

      const previousStock = availableStock;
      product.stockQuantity = availableStock - quantity;
      product.currentStock = product.stockQuantity;
      await product.save();
      stockUpdates.push({ productId: product._id, previousStock, newStock: product.stockQuantity, quantity, productName: product.name });

      invoiceItems.push({
        productId: product._id,
        productName: product.name,
        quantity,
        unit: product.unitType || product.unit,
        unitPrice,
        sellingPrice: unitPrice,
        totalPrice,
        subtotal: totalPrice,
        gstPercentage: gstRate,
        gstRate,
        gstAmount: itemGstAmount,
        lineTotal,
        total: lineTotal,
      });

      const threshold = Number(product.lowStockAlert ?? product.minimumStock ?? 0);
      if (threshold >= 0 && product.stockQuantity <= threshold) {
        await Notification.create({
          userId: req.user.userId,
          storeId: req.storeId,
          type: 'LOW_STOCK',
          title: 'Low stock alert',
          message: `Product ${product.name} has low stock (${product.stockQuantity}).`,
          channels: ['IN_APP'],
        });
      }
    }

    const discountAmount = Number(discount || 0);
    const roundOffAmount = Number(roundOff || 0);
    const paidAmount = Number(amountPaid || 0);
    const totalAmount = subtotal + totalGstAmount - discountAmount + roundOffAmount;
    const balanceDue = Number((totalAmount - paidAmount).toFixed(2));

    if (paidAmount < 0 || balanceDue < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot exceed total amount' });
    }

    if (balanceDue > 0) {
      const projectedCredit = Number(customer.totalCredit || 0) + balanceDue;
      if (projectedCredit > Number(customer.creditLimit || 0) && !req.body.overrideCreditLimit) {
        return res.status(400).json({ success: false, message: 'Credit limit reached. Contact Admin.' });
      }
      if (req.body.overrideCreditLimit && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only admin can override credit limit' });
      }
      customer.totalCredit = projectedCredit;
      await customer.save();
    }

    const createdInvoice = await Invoice.create({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      farmerUserId: customer.farmerUserId,
      invoiceNumber,
      customerId: customer._id,
      storeSnapshot: {
        storeName: settings?.companyName || settings?.shopName || store?.name || admin?.businessName || admin?.name || 'Unknown Store',
        ownerName: settings?.ownerName || store?.ownerName || admin?.ownerName || admin?.name || '',
        phone: settings?.companyPhone || settings?.shopPhone || store?.mobileNumber || admin?.mobileNumber || '',
        address: settings?.companyAddress || settings?.shopAddress || store?.address || admin?.businessAddress || '',
      },
      customerSnapshot: {
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        email: customer.email,
        village: customer.village,
        gstNumber: customer.gstNumber,
      },
      totalQuantity,
      subtotal,
      gstAmount: totalGstAmount,
      discount: discountAmount,
      roundOff: roundOffAmount,
      totalAmount,
      amountPaid: paidAmount,
      paidAmount,
      balanceDue,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING',
      paymentMethod,
      notes,
      items: invoiceItems,
    });

    await StockMovement.insertMany(stockUpdates.map((movement) => ({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      productId: movement.productId,
      type: 'SALE_OUT',
      referenceType: 'INVOICE',
      referenceId: createdInvoice._id,
      quantity: -Math.abs(movement.quantity),
      previousStock: movement.previousStock,
      newStock: movement.newStock,
      note: `Sold ${movement.productName} on ${createdInvoice.invoiceNumber}`,
    })));

    if (paidAmount > 0) {
      await Payment.create({
        adminId: getRequestAdminId(req),
        storeId: getRequestStoreId(req),
        invoiceId: createdInvoice._id,
        customerId: customer._id,
        amount: paidAmount,
        paymentMethod,
        referenceNumber,
        notes: paymentNotes,
      });
    }

    customer.totalPurchases = Number(customer.totalPurchases || 0) + totalAmount;
    customer.lastPurchaseDate = new Date();
    await customer.save();

    let populatedInvoice = await populateInvoice(Invoice.findById(createdInvoice._id));

    try {
      const pdfBuffer = await generateInvoicePDF(populatedInvoice, populatedInvoice.items, customer, settings || {});
      const fileName = `invoices/${createdInvoice.invoiceNumber}.pdf`;
      populatedInvoice.pdfUrl = await uploadFile('invoices', fileName, pdfBuffer);
      await populatedInvoice.save();
    } catch (pdfError) {
      console.warn('PDF generation skipped:', pdfError);
    }

    res.status(201).json({ success: true, message: 'Invoice created successfully', data: populatedInvoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const { search, customerId, status, startDate, endDate } = req.query;
    const filter = getOwnerFilter(req);
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }
    if (search) {
      const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { invoiceNumber: regex },
      ];
    }

    const invoices = await populateInvoice(Invoice.find(filter).sort({ invoiceDate: -1 }));
    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listSales = async (req, res) => {
  try {
    const { search, customerId, category, startDate, endDate } = req.query;
    const filter = getOwnerFilter(req);
    if (customerId) filter.customerId = customerId;
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await populateInvoice(Invoice.find(filter).sort({ invoiceDate: -1 }));
    const invoiceRows = invoices.flatMap((invoice) =>
      invoice.items.map((item) => ({
        id: `${invoice.id}-${item.id}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId?.toString(),
        customerName: invoice.customer?.name || '',
        productId: item.productId?.toString(),
        productName: item.product?.name || '',
        category: item.product?.category || 'FERTILIZER',
        quantity: item.quantity,
        weight: item.product?.pesticideWeight,
        weightUnit: item.product?.pesticideWeightUnit,
        unitType: item.product?.unitType || item.product?.unit,
        pricePerUnit: item.unitPrice,
        totalAmount: item.lineTotal,
        purchaseDate: invoice.invoiceDate,
      }))
    );
    const manualFilter = getOwnerFilter(req);
    if (customerId) manualFilter.customerId = customerId;
    if (startDate || endDate) {
      manualFilter.purchaseDate = {};
      if (startDate) manualFilter.purchaseDate.$gte = new Date(startDate);
      if (endDate) manualFilter.purchaseDate.$lte = new Date(endDate);
    }
    const manualItems = await CustomerPurchasedItem.find(manualFilter).populate('customer').populate('product');
    const manualRows = manualItems.map((item) => ({
      id: `manual-${item.id}`,
      invoiceId: null,
      invoiceNumber: 'Customer Purchase',
      customerId: item.customerId?.toString(),
      customerName: item.customer?.name || '',
      productId: item.productId?.toString(),
      productName: item.productName,
      category: item.category,
      quantity: item.quantity,
      weight: item.pesticideWeight,
      weightUnit: item.pesticideWeightUnit,
      unitType: item.unitType,
      pricePerUnit: item.pricePerUnit,
      totalAmount: item.totalAmount,
      purchaseDate: item.purchaseDate,
    }));
    const rows = [...invoiceRows, ...manualRows].filter((row) => {
      if (category && category !== 'ALL' && row.category !== category) return false;
      if (search) {
        const term = search.toLowerCase();
        return [row.customerName, row.productName, row.invoiceNumber].some((value) => String(value).toLowerCase().includes(term));
      }
      return true;
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List sales error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await populateInvoice(Invoice.findOne(getOwnerFilter(req, { _id: req.params.id })));
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const payments = await Payment.find(getOwnerFilter(req, { invoiceId: invoice._id }));
    res.json({ success: true, data: { ...invoice.toJSON(), payments } });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const invoice = await populateInvoice(Invoice.findOneAndUpdate(getOwnerFilter(req, { _id: req.params.id }), { status: req.body.status }, { returnDocument: 'after' }));
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice updated successfully', data: invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await ownedDocument(Invoice, req, req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    for (const item of invoice.items) {
      const product = await ownedDocument(Product, req, item.productId);
      if (product) {
        product.stockQuantity = Number(product.stockQuantity ?? product.currentStock ?? 0) + item.quantity;
        product.currentStock = product.stockQuantity;
        await product.save();
      }
    }

    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
