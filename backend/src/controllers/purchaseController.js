import { Product, Purchase, StockMovement, Supplier } from '../models/index.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId, ownedDocument } from '../utils/ownership.js';

const populatePurchase = (query) =>
  query.populate('supplier').populate('items.product');

const buildPurchaseItemPayload = (item, product) => {
  const quantity = Number(item.quantity || 0);
  const purchasePrice = Number(item.purchasePrice ?? item.unitPrice ?? 0);
  const sellingPrice = Number(item.sellingPrice ?? product.sellingPrice ?? product.pricePerUnit ?? 0);
  const gstRate = Number(item.gstRate ?? item.gstPercentage ?? product.gstRate ?? product.gstPercentage ?? 0);
  const totalCost = Number((quantity * purchasePrice).toFixed(2));
  const gstAmount = Number((totalCost * (gstRate / 100)).toFixed(2));
  return {
    productId: product._id,
    productName: product.name,
    quantity,
    unit: product.unitType || product.unit,
    unitPrice: purchasePrice,
    purchasePrice,
    sellingPrice,
    totalPrice: totalCost,
    totalCost,
    batchNumber: item.batchNumber,
    expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
    gstRate,
    gstAmount,
  };
};

const applyPurchaseStock = async (req, purchase) => {
  if (purchase.stockApplied) return [];

  const movements = [];
  for (const item of purchase.items) {
    const product = await ownedDocument(Product, req, item.productId);
    if (!product) continue;

    const previousStock = Number(product.stockQuantity ?? product.currentStock ?? 0);
    const newStock = previousStock + Number(item.quantity || 0);
    product.stockQuantity = newStock;
    product.currentStock = newStock;
    product.purchasePrice = Number(item.purchasePrice ?? item.unitPrice ?? product.purchasePrice ?? 0);
    if (item.sellingPrice !== undefined) {
      product.sellingPrice = Number(item.sellingPrice || 0);
      product.pricePerUnit = Number(item.sellingPrice || 0);
    }
    if (item.batchNumber) product.batchNumber = item.batchNumber;
    if (item.expiryDate) product.expiryDate = item.expiryDate;
    if (item.gstRate !== undefined) {
      product.gstRate = Number(item.gstRate || 0);
      product.gstPercentage = Number(item.gstRate || 0);
    }
    product.supplierId = purchase.supplierId;
    await product.save();

    movements.push({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      productId: product._id,
      type: 'PURCHASE_IN',
      referenceType: 'PURCHASE',
      referenceId: purchase._id,
      quantity: Number(item.quantity || 0),
      previousStock,
      newStock,
      note: `Purchase ${purchase.purchaseNumber}`,
    });
  }

  if (movements.length) await StockMovement.insertMany(movements);
  purchase.stockApplied = true;
  purchase.receivedAt = purchase.receivedAt || new Date();
  return movements;
};

export const createPurchase = async (req, res) => {
  try {
    const { supplierId, items, purchaseDate, deliveryDate, notes, status = 'PENDING' } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and items are required' });
    }

    const supplier = await ownedDocument(Supplier, req, supplierId);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    let subtotal = 0;
    let gstAmount = 0;
    const purchaseItems = [];
    for (const item of items) {
      const product = await ownedDocument(Product, req, item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const payload = buildPurchaseItemPayload(item, product);
      if (!payload.productId || !payload.quantity || payload.quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Each purchase item must have a valid product and quantity' });
      }
      subtotal += payload.totalCost;
      gstAmount += payload.gstAmount;
      purchaseItems.push(payload);
    }
    const totalAmount = Number((subtotal + gstAmount).toFixed(2));

    const purchase = await Purchase.create({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      purchaseNumber: `PUR-${Date.now()}`,
      supplierId: supplier._id,
      supplierName: supplier.name,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      subtotal: Number(subtotal.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      totalAmount,
      status,
      notes,
      items: purchaseItems,
    });

    if (status === 'RECEIVED') {
      await applyPurchaseStock(req, purchase);
      await purchase.save();
    }

    const populated = await populatePurchase(Purchase.findById(purchase._id));
    res.status(201).json({ success: true, message: 'Purchase created successfully', data: populated });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const listPurchases = async (req, res) => {
  try {
    const { supplierId, status, startDate, endDate } = req.query;
    const filter = getOwnerFilter(req);
    if (supplierId) filter.supplierId = supplierId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await populatePurchase(Purchase.find(filter).sort({ purchaseDate: -1 }));
    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error('List purchases error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPurchase = async (req, res) => {
  try {
    const purchase = await populatePurchase(Purchase.findOne(getOwnerFilter(req, { _id: req.params.id })));
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const purchase = await ownedDocument(Purchase, req, req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (purchase.status === 'RECEIVED') {
      return res.status(400).json({ success: false, message: 'Received purchases cannot be edited' });
    }

    const { supplierId, items, purchaseDate, deliveryDate, notes } = req.body;
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and items are required' });
    }

    const supplier = await ownedDocument(Supplier, req, supplierId);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    let subtotal = 0;
    let gstAmount = 0;
    const purchaseItems = [];
    for (const item of items) {
      const product = await ownedDocument(Product, req, item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const payload = buildPurchaseItemPayload(item, product);
      subtotal += payload.totalCost;
      gstAmount += payload.gstAmount;
      purchaseItems.push(payload);
    }
    const totalAmount = Number((subtotal + gstAmount).toFixed(2));

    purchase.supplierId = supplier._id;
    purchase.supplierName = supplier.name;
    purchase.purchaseDate = purchaseDate ? new Date(purchaseDate) : purchase.purchaseDate;
    purchase.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    purchase.notes = notes;
    purchase.subtotal = Number(subtotal.toFixed(2));
    purchase.gstAmount = Number(gstAmount.toFixed(2));
    purchase.totalAmount = totalAmount;
    purchase.items = purchaseItems;
    await purchase.save();

    const populated = await populatePurchase(Purchase.findById(purchase._id));
    res.json({ success: true, message: 'Purchase updated successfully', data: populated });
  } catch (error) {
    console.error('Update purchase error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const updatePurchaseStatus = async (req, res) => {
  try {
    const purchase = await ownedDocument(Purchase, req, req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    if (req.body.status === 'RECEIVED' && !purchase.stockApplied) {
      await applyPurchaseStock(req, purchase);
    }

    purchase.status = req.body.status;
    await purchase.save();
    const populated = await populatePurchase(Purchase.findById(purchase._id));
    res.json({ success: true, message: 'Purchase updated successfully', data: populated });
  } catch (error) {
    console.error('Update purchase error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOneAndDelete(getOwnerFilter(req, { _id: req.params.id }));
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
