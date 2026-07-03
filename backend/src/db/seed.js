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
};
