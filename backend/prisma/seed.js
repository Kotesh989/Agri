import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create default admin user
  try {
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@fertilizershop.com' },
    });

    if (!adminExists) {
      const hashedPassword = await hashPassword('Admin@123');
      await prisma.user.create({
        data: {
          email: 'admin@fertilizershop.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
        },
      });
      console.log('✓ Admin user created');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  }

  // Create settings
  try {
    const settingsExists = await prisma.settings.findFirst();
    if (!settingsExists) {
      await prisma.settings.create({
        data: {
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
          currencySymbol: '₹',
          expiryAlertDays: 30,
        },
      });
      console.log('✓ Settings created');
    }
  } catch (error) {
    console.error('Error creating settings:', error);
  }

  // Create sample products
  const products = [
    {
      name: 'Urea',
      brandName: 'National Fertilizer',
      brand: 'National Fertilizer',
      category: 'FERTILIZER',
      stockQuantity: 500,
      unitType: 'Kg',
      pricePerUnit: 300,
      lowStockAlert: 100,
      npkRatio: '46:0:0',
      batchNumber: 'UREA001',
      expiryDate: new Date('2026-12-31'),
      purchasePrice: 250,
      sellingPrice: 300,
      gstPercentage: 5,
      unit: 'kg',
      currentStock: 500,
      minimumStock: 100,
    },
    {
      name: 'DAP',
      brandName: 'National Fertilizer',
      brand: 'National Fertilizer',
      category: 'FERTILIZER',
      stockQuantity: 300,
      unitType: 'Kg',
      pricePerUnit: 420,
      lowStockAlert: 50,
      npkRatio: '18:46:0',
      batchNumber: 'DAP001',
      expiryDate: new Date('2026-12-31'),
      purchasePrice: 350,
      sellingPrice: 420,
      gstPercentage: 5,
      unit: 'kg',
      currentStock: 300,
      minimumStock: 50,
    },
    {
      name: 'MOP',
      brandName: 'Potash Corporation',
      brand: 'Potash Corporation',
      category: 'FERTILIZER',
      stockQuantity: 250,
      unitType: 'Kg',
      pricePerUnit: 380,
      lowStockAlert: 50,
      npkRatio: '0:0:60',
      batchNumber: 'MOP001',
      expiryDate: new Date('2026-12-31'),
      purchasePrice: 320,
      sellingPrice: 380,
      gstPercentage: 5,
      unit: 'kg',
      currentStock: 250,
      minimumStock: 50,
    },
    {
      name: 'NPK 20:20:0:13',
      brandName: 'National Fertilizer',
      brand: 'National Fertilizer',
      category: 'FERTILIZER',
      stockQuantity: 400,
      unitType: 'Kg',
      pricePerUnit: 480,
      lowStockAlert: 100,
      npkRatio: '20:20:0:13',
      batchNumber: 'NPK001',
      expiryDate: new Date('2026-12-31'),
      purchasePrice: 400,
      sellingPrice: 480,
      gstPercentage: 5,
      unit: 'kg',
      currentStock: 400,
      minimumStock: 100,
    },
    {
      name: 'Potassium Chloride',
      brandName: 'Tata Chemicals',
      brand: 'Tata Chemicals',
      category: 'FERTILIZER',
      stockQuantity: 200,
      unitType: 'Kg',
      pricePerUnit: 340,
      lowStockAlert: 40,
      npkRatio: '0:0:50',
      batchNumber: 'KCL001',
      expiryDate: new Date('2026-12-31'),
      purchasePrice: 280,
      sellingPrice: 340,
      gstPercentage: 5,
      unit: 'kg',
      currentStock: 200,
      minimumStock: 40,
    },
    {
      name: 'Ammonium Sulfate',
      brandName: 'Coromandel',
      brand: 'Coromandel',
      category: 'FERTILIZER',
      stockQuantity: 600,
      unitType: 'Kg',
      pricePerUnit: 220,
      lowStockAlert: 150,
      npkRatio: '21:0:0:24',
      batchNumber: 'AS001',
      expiryDate: new Date('2026-12-31'),
      purchasePrice: 180,
      sellingPrice: 220,
      gstPercentage: 5,
      unit: 'kg',
      currentStock: 600,
      minimumStock: 150,
    },
  ];

  try {
    for (const product of products) {
      const exists = await prisma.product.findFirst({
        where: { name: product.name },
      });

      if (!exists) {
        await prisma.product.create({
          data: product,
        });
      }
    }
    console.log('✓ Sample products created');
  } catch (error) {
    console.error('Error creating products:', error);
  }

  try {
    const farmer = await prisma.customer.upsert({
      where: { mobileNumber: '9876500000' },
      update: {},
      create: {
        name: 'Sample Farmer',
        mobileNumber: '9876500000',
        email: 'farmer@example.com',
        city: 'Bangalore',
        state: 'Karnataka',
        creditLimit: 5000,
      },
    });

    const farmerUser = await prisma.user.findUnique({ where: { email: 'farmer@example.com' } });
    if (!farmerUser) {
      await prisma.user.create({
        data: {
          email: 'farmer@example.com',
          mobileNumber: farmer.mobileNumber,
          password: await hashPassword('Farmer@123'),
          name: 'Sample Farmer',
          role: 'FARMER',
          customerId: farmer.id,
        },
      });
    }
  } catch (error) {
    console.error('Error creating sample farmer:', error);
  }

  // Create sample supplier
  try {
    const supplierExists = await prisma.supplier.findFirst();
    if (!supplierExists) {
      await prisma.supplier.create({
        data: {
          name: 'National Fertilizer Limited',
          contactPerson: 'Mr. Sharma',
          mobileNumber: '9876543210',
          email: 'contact@nationalfert.com',
          address: '456 Industrial Area',
          city: 'Delhi',
          state: 'Delhi',
          pinCode: '110001',
          gstNumber: '07AABCT1234H1Z5',
        },
      });
      console.log('✓ Sample supplier created');
    }
  } catch (error) {
    console.error('Error creating supplier:', error);
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
