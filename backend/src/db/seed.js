import {
  Customer,
  CustomerPurchasedItem,
  Invoice,
  Payment,
  Product,
  Purchase,
  Settings,
  Store,
  FarmerStoreLink,
  Supplier,
  User,
} from '../models/index.js';
import { hashPassword } from '../utils/password.js';

const assignDefaultStoreToLegacyCustomers = async (defaultAdmin, defaultStore) => {
  const legacyCustomers = await Customer.find({
    storeId: { $exists: false },
    adminId: defaultAdmin._id,
  });

  for (const customer of legacyCustomers) {
    const duplicate = await Customer.findOne({
      _id: { $ne: customer._id },
      adminId: defaultAdmin._id,
      storeId: defaultStore._id,
      mobileNumber: customer.mobileNumber,
    });

    if (duplicate) {
      await Promise.all([
        CustomerPurchasedItem.updateMany({ customerId: customer._id }, { $set: { customerId: duplicate._id, storeId: defaultStore._id } }),
        Invoice.updateMany({ customerId: customer._id }, { $set: { customerId: duplicate._id, storeId: defaultStore._id } }),
        Payment.updateMany({ customerId: customer._id }, { $set: { customerId: duplicate._id, storeId: defaultStore._id } }),
        User.updateMany({ customerId: customer._id }, { $set: { customerId: duplicate._id } }),
      ]);

      if (!duplicate.farmerUserId && customer.farmerUserId) duplicate.farmerUserId = customer.farmerUserId;
      duplicate.totalCredit = Math.max(Number(duplicate.totalCredit || 0), Number(customer.totalCredit || 0));
      duplicate.creditLimit = Math.max(Number(duplicate.creditLimit || 0), Number(customer.creditLimit || 0));
      await duplicate.save();
      await customer.deleteOne();
    } else {
      customer.storeId = defaultStore._id;
      await customer.save();
    }
  }
};

export const seedMongo = async () => {
  const existingProducts = await Product.find();
  for (const product of existingProducts) {
    const normalizedCategory = ['PESTICIDE', 'INSECTICIDE', 'HERBICIDE', 'FUNGICIDE'].includes(String(product.category || '').toUpperCase())
      ? 'PESTICIDE'
      : 'FERTILIZER';
    let changed = false;

    if (product.category !== normalizedCategory) {
      product.category = normalizedCategory;
      changed = true;
    }
    if (!product.brandName && product.brand) {
      product.brandName = product.brand;
      changed = true;
    }
    if (!product.unitType && product.unit) {
      product.unitType = product.unit;
      changed = true;
    }
    if ((product.stockQuantity === undefined || product.stockQuantity === null || product.stockQuantity === 0) && Number(product.currentStock || 0) > 0) {
      product.stockQuantity = Number(product.currentStock || 0);
      changed = true;
    }
    if ((product.pricePerUnit === undefined || product.pricePerUnit === null || product.pricePerUnit === 0) && Number(product.sellingPrice || 0) > 0) {
      product.pricePerUnit = Number(product.sellingPrice || 0);
      changed = true;
    }
    if ((product.lowStockAlert === undefined || product.lowStockAlert === null || product.lowStockAlert === 0) && Number(product.minimumStock || 0) > 0) {
      product.lowStockAlert = Number(product.minimumStock || 0);
      changed = true;
    }

    if (changed) {
      await product.save();
    }
  }

  let defaultAdmin = await User.findOne({ email: 'admin@fertilizershop.com' });
  if (!defaultAdmin) {
    defaultAdmin = await User.create({
      email: 'admin@fertilizershop.com',
      password: await hashPassword('Admin@123'),
      name: 'Admin User',
      role: 'ADMIN',
    });
    console.log('Seeded admin user');
  }
  if (!defaultAdmin.adminId) {
    defaultAdmin.adminId = defaultAdmin._id;
    await defaultAdmin.save();
  }

  const adminsWithoutOwner = await User.find({ role: 'ADMIN', $or: [{ adminId: { $exists: false } }, { adminId: null }] });
  for (const admin of adminsWithoutOwner) {
    admin.adminId = admin._id;
    await admin.save();
  }

  const legacyOwnerFilter = { $or: [{ adminId: { $exists: false } }, { adminId: null }] };
  await Promise.all([
    User.updateMany({ role: 'FARMER', ...legacyOwnerFilter }, { $set: { adminId: defaultAdmin._id } }),
    Customer.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
    CustomerPurchasedItem.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
    Product.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
    Supplier.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
    Invoice.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
    Payment.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
    Purchase.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
    Settings.updateMany(legacyOwnerFilter, { $set: { adminId: defaultAdmin._id } }),
  ]);

  let defaultStore = await Store.findOne({ ownerAdminId: defaultAdmin._id });
  if (!defaultStore) {
    defaultStore = await Store.create({
      ownerAdminId: defaultAdmin._id,
      name: 'Agri Fertilizer Shop',
      ownerName: defaultAdmin.name,
      mobileNumber: '+91-80-12345678',
      address: '123 Market Street',
      village: 'Bangalore',
      taluk: 'Bangalore North',
      district: 'Bangalore Urban',
      state: 'Karnataka',
      gstNumber: '29AAPCP1234H1Z5',
      subscriptionStatus: 'ACTIVE',
    });
    console.log('Seeded default store');
  }

  await assignDefaultStoreToLegacyCustomers(defaultAdmin, defaultStore);

  await Promise.all([
    CustomerPurchasedItem.updateMany({ storeId: { $exists: false }, adminId: defaultAdmin._id }, { $set: { storeId: defaultStore._id } }),
    Product.updateMany({ storeId: { $exists: false }, adminId: defaultAdmin._id }, { $set: { storeId: defaultStore._id } }),
    Supplier.updateMany({ storeId: { $exists: false }, adminId: defaultAdmin._id }, { $set: { storeId: defaultStore._id } }),
    Invoice.updateMany({ storeId: { $exists: false }, adminId: defaultAdmin._id }, { $set: { storeId: defaultStore._id } }),
    Payment.updateMany({ storeId: { $exists: false }, adminId: defaultAdmin._id }, { $set: { storeId: defaultStore._id } }),
    Purchase.updateMany({ storeId: { $exists: false }, adminId: defaultAdmin._id }, { $set: { storeId: defaultStore._id } }),
    Settings.updateMany({ storeId: { $exists: false }, adminId: defaultAdmin._id }, { $set: { storeId: defaultStore._id } }),
  ]);

  let sampleFarmer = await Customer.findOne({ adminId: defaultAdmin._id, mobileNumber: '9876500000' });
  if (!sampleFarmer) {
    sampleFarmer = await Customer.create({
      adminId: defaultAdmin._id,
      storeId: defaultStore._id,
      name: 'Sample Farmer',
      mobileNumber: '9876500000',
      email: 'farmer@example.com',
      city: 'Bangalore',
      state: 'Karnataka',
      creditLimit: 5000,
      totalCredit: 0,
    });
    console.log('Seeded sample farmer customer');
  }

  const farmerExists = await User.exists({ email: 'farmer@example.com' });
  if (!farmerExists) {
    await User.create({
      email: 'farmer@example.com',
      mobileNumber: sampleFarmer.mobileNumber,
      password: await hashPassword('Farmer@123'),
      name: 'Sample Farmer',
      role: 'FARMER',
      customerId: sampleFarmer._id,
      adminId: defaultAdmin._id,
    });
    console.log('Seeded sample farmer user');
  }

  const sampleFarmerUser = await User.findOne({ email: 'farmer@example.com' });
  if (sampleFarmerUser) {
    await FarmerStoreLink.findOneAndUpdate(
      { farmerId: sampleFarmerUser._id, storeId: defaultStore._id },
      { customerId: sampleFarmer._id, lastVisitDate: new Date() },
      { upsert: true, returnDocument: 'after' }
    );
  }

  const settingsExists = await Settings.exists({ adminId: defaultAdmin._id });
  if (!settingsExists) {
    await Settings.create({
      adminId: defaultAdmin._id,
      storeId: defaultStore._id,
      shopName: 'Agri Fertilizer Shop',
      shopAddress: '123 Market Street',
      shopCity: 'Bangalore',
      shopState: 'Karnataka',
      shopPinCode: '560001',
      shopPhone: '+91-80-12345678',
      shopEmail: 'info@fertilizershop.com',
      gstNumber: '29AAPCP1234H1Z5',
      invoicePrefix: 'INV',
      receiptPrefix: 'RCP',
      currencySymbol: 'Rs.',
      expiryAlertDays: 30,
    });
    console.log('Seeded settings');
  }

  const productCount = await Product.countDocuments({ adminId: defaultAdmin._id });
  if (productCount === 0) {
    await Product.insertMany([
      {
        adminId: defaultAdmin._id,
        storeId: defaultStore._id,
        name: 'Urea',
        brandName: 'National Fertilizer',
        category: 'FERTILIZER',
        stockQuantity: 500,
        unitType: 'Kg',
        pricePerUnit: 300,
        lowStockAlert: 100,
        brand: 'National Fertilizer',
        npkRatio: '46:0:0',
        batchNumber: 'UREA001',
        expiryDate: new Date('2026-12-31'),
        purchasePrice: 250,
        sellingPrice: 300,
        gstPercentage: 5,
        unit: 'kg',
        currentStock: 500,
        minimumStock: 100,
        packSize: '50 Kg bag',
        description: 'High nitrogen fertilizer for vegetative growth.',
        recommendedCrops: ['Paddy', 'Wheat', 'Maize'],
        applicationInstructions: 'Apply as per soil-test recommendation and irrigate after application.',
      },
      {
        adminId: defaultAdmin._id,
        storeId: defaultStore._id,
        name: 'DAP',
        brandName: 'National Fertilizer',
        category: 'FERTILIZER',
        stockQuantity: 300,
        unitType: 'Kg',
        pricePerUnit: 420,
        lowStockAlert: 50,
        brand: 'National Fertilizer',
        npkRatio: '18:46:0',
        batchNumber: 'DAP001',
        expiryDate: new Date('2026-12-31'),
        purchasePrice: 350,
        sellingPrice: 420,
        gstPercentage: 5,
        unit: 'kg',
        currentStock: 300,
        minimumStock: 50,
        packSize: '50 Kg bag',
        description: 'Phosphatic fertilizer for root development.',
        recommendedCrops: ['Pulses', 'Oilseeds', 'Vegetables'],
        applicationInstructions: 'Use as basal dose during sowing.',
      },
      {
        adminId: defaultAdmin._id,
        storeId: defaultStore._id,
        name: 'MOP',
        brandName: 'Potash Corporation',
        category: 'FERTILIZER',
        stockQuantity: 250,
        unitType: 'Kg',
        pricePerUnit: 380,
        lowStockAlert: 50,
        brand: 'Potash Corporation',
        npkRatio: '0:0:60',
        batchNumber: 'MOP001',
        expiryDate: new Date('2026-12-31'),
        purchasePrice: 320,
        sellingPrice: 380,
        gstPercentage: 5,
        unit: 'kg',
        currentStock: 250,
        minimumStock: 50,
        packSize: '50 Kg bag',
        description: 'Potassic fertilizer supporting fruit quality and stress tolerance.',
        recommendedCrops: ['Banana', 'Sugarcane', 'Potato'],
        applicationInstructions: 'Split application is recommended for long-duration crops.',
      },
      {
        adminId: defaultAdmin._id,
        storeId: defaultStore._id,
        name: 'NPK 20:20:0:13',
        brandName: 'National Fertilizer',
        category: 'FERTILIZER',
        stockQuantity: 180,
        unitType: 'Kg',
        pricePerUnit: 480,
        lowStockAlert: 40,
        brand: 'National Fertilizer',
        npkRatio: '20:20:0:13',
        currentStock: 180,
        minimumStock: 40,
        packSize: '50 Kg bag',
        description: 'Balanced nutrient mix with sulphur.',
        recommendedCrops: ['Groundnut', 'Cotton', 'Vegetables'],
        applicationInstructions: 'Use during basal application based on crop requirement.',
      },
      {
        adminId: defaultAdmin._id,
        storeId: defaultStore._id,
        name: 'Zinc Sulphate',
        brandName: 'Agri Minerals',
        category: 'FERTILIZER',
        stockQuantity: 70,
        unitType: 'Kg',
        pricePerUnit: 95,
        lowStockAlert: 20,
        brand: 'Agri Minerals',
        npkRatio: 'Zn 21%',
        currentStock: 70,
        minimumStock: 20,
        packSize: '10 Kg bag',
        description: 'Micronutrient supplement for zinc deficiency correction.',
        recommendedCrops: ['Paddy', 'Maize', 'Citrus'],
        applicationInstructions: 'Apply to soil or as foliar spray per agronomist guidance.',
      },
      {
        adminId: defaultAdmin._id,
        storeId: defaultStore._id,
        name: 'Organic Fertilizer',
        brandName: 'GreenGrow',
        category: 'FERTILIZER',
        stockQuantity: 120,
        unitType: 'Kg',
        pricePerUnit: 260,
        lowStockAlert: 30,
        brand: 'GreenGrow',
        currentStock: 120,
        minimumStock: 30,
        packSize: '25 Kg bag',
        description: 'Organic soil conditioner for long-term soil health.',
        recommendedCrops: ['All crops'],
        applicationInstructions: 'Mix with soil before planting or during field preparation.',
      },
    ]);
    console.log('Seeded products');
  }

  const supplierExists = await Supplier.exists({ adminId: defaultAdmin._id });
  if (!supplierExists) {
    await Supplier.create({
      adminId: defaultAdmin._id,
      storeId: defaultStore._id,
      name: 'National Fertilizer Limited',
      contactPerson: 'Mr. Sharma',
      mobileNumber: '9876543210',
      email: 'contact@nationalfert.com',
      address: '456 Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
      gstNumber: '07AABCT1234H1Z5',
    });
    console.log('Seeded supplier');
  }
};
