import { CustomerPurchasedItem, Product, Supplier } from '../models/index.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId, ownedDocument } from '../utils/ownership.js';

const searchRegex = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const pesticideWeightUnits = ['Gram', 'Kg', 'ML', 'Litre'];

const pesticideCategories = new Set(['PESTICIDE', 'INSECTICIDE', 'HERBICIDE', 'FUNGICIDE']);
const normalizeCategory = (category) => pesticideCategories.has(String(category || 'FERTILIZER').trim().toUpperCase())
  ? 'PESTICIDE'
  : 'FERTILIZER';

const buildProductPayload = (body) => {
  const category = normalizeCategory(body.category);
  const pesticideWeight = body.pesticideWeight === '' || body.pesticideWeight === undefined
    ? undefined
    : Number(body.pesticideWeight);
  const stockQuantity = Number(body.stockQuantity ?? body.currentStock ?? 0);
  const pricePerUnit = Number(body.pricePerUnit ?? body.sellingPrice ?? 0);
  const lowStockAlert = Number(body.lowStockAlert ?? body.minimumStock ?? 0);
  const minimumStock = Number(body.minimumStock ?? body.lowStockAlert ?? 0);
  const brandName = String(body.brandName ?? body.brand ?? '').trim();
  const unitType = String(body.unitType ?? body.unit ?? '').trim();

  const gstRate = Number(body.gstRate ?? body.gstPercentage ?? 0);
  return {
    name: String(body.name || '').trim(),
    category,
    brandName,
    stockQuantity,
    unitType,
    pricePerUnit,
    pesticideWeight: category === 'PESTICIDE' ? pesticideWeight : undefined,
    pesticideWeightUnit: category === 'PESTICIDE' ? body.pesticideWeightUnit : undefined,
    lowStockAlert,
    description: body.description,
    packSize: body.packSize,
    imageUrl: body.imageUrl,
    recommendedCrops: Array.isArray(body.recommendedCrops) ? body.recommendedCrops : String(body.recommendedCrops || '').split(',').map((item) => item.trim()).filter(Boolean),
    applicationInstructions: body.applicationInstructions,
    supplierId: body.supplierId || undefined,

    brand: brandName,
    npkRatio: body.npkRatio,
    batchNumber: body.batchNumber,
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    purchasePrice: Number(body.purchasePrice || 0),
    sellingPrice: pricePerUnit,
    gstPercentage: gstRate,
    gstRate,
    unit: unitType,
    currentStock: stockQuantity,
    lowStockAlert,
    minimumStock,
  };
};

const validateProductPayload = (payload) => {
  if (!payload.name) return 'Product name is required';
  if (!payload.brandName) return 'Brand name is required';
  if (!payload.unitType) return 'Unit type is required';
  if (!Number.isFinite(payload.stockQuantity) || payload.stockQuantity < 0) return 'Stock quantity must be zero or greater';
  if (!Number.isFinite(payload.pricePerUnit) || payload.pricePerUnit < 0) return 'Price per unit must be zero or greater';
  if (!Number.isFinite(payload.lowStockAlert) || payload.lowStockAlert < 0) return 'Low stock alert must be zero or greater';
  if (payload.category === 'PESTICIDE') {
    if (payload.pesticideWeight !== undefined && (!Number.isFinite(payload.pesticideWeight) || payload.pesticideWeight <= 0)) {
      return 'Pesticide weight must be greater than zero';
    }
    if (payload.pesticideWeight !== undefined && !pesticideWeightUnits.includes(payload.pesticideWeightUnit)) {
      return 'Valid pesticide weight unit is required';
    }
  }
  return null;
};

export const createProduct = async (req, res) => {
  try {
    const payload = buildProductPayload(req.body);
    const validationError = validateProductPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if (payload.supplierId) {
      const supplier = await ownedDocument(Supplier, req, payload.supplierId);
      if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const product = await Product.create({ ...payload, adminId: getRequestAdminId(req), storeId: getRequestStoreId(req) });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listProducts = async (req, res) => {
  try {
    const { search, category, brand } = req.query;
    const filter = getOwnerFilter(req);

    if (search) {
      const regex = searchRegex(search);
      filter.$or = [{ name: regex }, { brandName: regex }, { brand: regex }, { description: regex }, { npkRatio: regex }];
    }
    if (category && category !== 'ALL') filter.category = normalizeCategory(category);
    if (brand) filter.$or = [...(filter.$or || []), { brandName: searchRegex(brand) }, { brand: searchRegex(brand) }];

    const products = await Product.find(filter).populate('supplierId').sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await ownedDocument(Product, req, req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await ownedDocument(Product, req, req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const payload = buildProductPayload({ ...product.toObject(), ...req.body });
    const validationError = validateProductPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    if (payload.supplierId) {
      const supplier = await ownedDocument(Supplier, req, payload.supplierId);
      if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    Object.assign(product, payload);
    if (payload.category !== 'PESTICIDE') {
      product.pesticideWeight = undefined;
      product.pesticideWeightUnit = undefined;
    }
    await product.save();

    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const inUse = await CustomerPurchasedItem.exists(getOwnerFilter(req, { productId: req.params.id }));
    if (inUse) {
      return res.status(400).json({
        success: false,
        message: 'Product is linked to customer purchases and cannot be deleted',
      });
    }

    const product = await Product.findOneAndDelete(getOwnerFilter(req, { _id: req.params.id }));
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
