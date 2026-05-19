import { Purchase, Supplier } from '../models/index.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId, ownedDocument } from '../utils/ownership.js';

const searchRegex = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

export const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, mobileNumber, email, address, city, state, pinCode, gstNumber } = req.body;

    if (!name || !mobileNumber) {
      return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
    }

    const supplier = await Supplier.create({ adminId: getRequestAdminId(req), storeId: getRequestStoreId(req), name, contactPerson, mobileNumber, email, address, city, state, pinCode, gstNumber });
    res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listSuppliers = async (req, res) => {
  try {
    const filter = getOwnerFilter(req);
    if (req.query.search) {
      const regex = searchRegex(req.query.search);
      filter.$or = [{ name: regex }, { mobileNumber: regex }, { email: regex }];
    }

    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('List suppliers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSupplier = async (req, res) => {
  try {
    const supplier = await ownedDocument(Supplier, req, req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const purchases = await Purchase.find(getOwnerFilter(req, { supplierId: supplier._id }));
    res.json({ success: true, data: { ...supplier.toJSON(), purchases } });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await ownedDocument(Supplier, req, req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && value !== '') supplier[key] = value;
    });
    await supplier.save();

    res.json({ success: true, message: 'Supplier updated successfully', data: supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndDelete(getOwnerFilter(req, { _id: req.params.id }));
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
