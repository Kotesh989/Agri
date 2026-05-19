import assert from 'node:assert/strict';
import test from 'node:test';
import { addCustomerPurchasedItem } from '../src/controllers/customerController.js';
import { createPurchase, updatePurchaseStatus } from '../src/controllers/purchaseController.js';
import { Customer, CustomerPurchasedItem, Invoice, Payment, Product, Purchase, Settings, StockMovement, Store, Supplier, User } from '../src/models/index.js';

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const makeQuery = (result) => ({
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  then(resolve) {
    return Promise.resolve(result).then(resolve);
  },
});

test('farmer sale creates linked invoice, reduces product stock, and records stock movement', async () => {
  const originals = {
    customerFindOne: Customer.findOne,
    purchasedItemCreate: CustomerPurchasedItem.create,
    productFindOne: Product.findOne,
    invoiceCreate: Invoice.create,
    paymentCreate: Payment.create,
    stockMovementCreate: StockMovement.create,
    settingsFindOne: Settings.findOne,
    storeFindOne: Store.findOne,
    userFindById: User.findById,
  };

  const customer = {
    _id: 'customer-1',
    id: 'customer-1',
    farmerUserId: 'farmer-1',
    name: 'Ravi Farmer',
    mobileNumber: '9999999999',
    email: 'ravi@example.com',
    village: 'Village',
    gstNumber: 'GST',
    totalCredit: 0,
    totalPurchases: 0,
    creditLimit: 10000,
    save: async function save() {
      return this;
    },
  };
  const product = {
    _id: 'product-1',
    name: 'DAP',
    category: 'FERTILIZER',
    unitType: 'Bag',
    pricePerUnit: 1200,
    sellingPrice: 1200,
    gstRate: 5,
    stockQuantity: 10,
    currentStock: 10,
    save: async function save() {
      return this;
    },
  };
  let createdInvoice;
  let createdMovement;

  Customer.findOne = () => makeQuery(customer);
  Product.findOne = (filter) => makeQuery(filter._id === 'product-1' ? product : null);
  CustomerPurchasedItem.create = async (payload) => ({ _id: 'manual-sale-1', ...payload });
  Invoice.create = async (payload) => {
    createdInvoice = { _id: 'invoice-1', ...payload };
    return createdInvoice;
  };
  Payment.create = async (payload) => ({ _id: 'payment-1', ...payload });
  StockMovement.create = async (payload) => {
    createdMovement = payload;
    return payload;
  };
  Settings.findOne = async () => ({ companyName: 'Green Store', ownerName: 'Owner', companyPhone: '111', companyAddress: 'Market Road' });
  Store.findOne = async () => ({ name: 'Fallback Store' });
  User.findById = async () => ({ name: 'Admin' });

  try {
    const res = makeResponse();
    await addCustomerPurchasedItem({
      params: { id: 'customer-1' },
      body: { productId: 'product-1', productName: 'DAP', quantity: 2, unitType: 'Bag', pricePerUnit: 1200, amountPaid: 1000 },
      headers: {},
      storeId: 'store-1',
      user: { role: 'ADMIN', userId: 'admin-1' },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(product.stockQuantity, 8);
    assert.equal(createdInvoice.farmerUserId, 'farmer-1');
    assert.equal(createdInvoice.storeSnapshot.storeName, 'Green Store');
    assert.equal(createdInvoice.customerSnapshot.email, 'ravi@example.com');
    assert.equal(createdInvoice.amountPaid, 1000);
    assert.equal(createdInvoice.balanceDue, 1520);
    assert.equal(customer.totalCredit, 1520);
    assert.equal(customer.totalPurchases, 2520);
    assert.equal(createdMovement.type, 'SALE_OUT');
    assert.equal(createdMovement.quantity, -2);
    assert.equal(createdMovement.previousStock, 10);
    assert.equal(createdMovement.newStock, 8);
  } finally {
    Customer.findOne = originals.customerFindOne;
    CustomerPurchasedItem.create = originals.purchasedItemCreate;
    Product.findOne = originals.productFindOne;
    Invoice.create = originals.invoiceCreate;
    Payment.create = originals.paymentCreate;
    StockMovement.create = originals.stockMovementCreate;
    Settings.findOne = originals.settingsFindOne;
    Store.findOne = originals.storeFindOne;
    User.findById = originals.userFindById;
  }
});

test('received wholesaler purchase increases stock and cannot be applied twice', async () => {
  const originals = {
    supplierFindOne: Supplier.findOne,
    productFindOne: Product.findOne,
    purchaseCreate: Purchase.create,
    purchaseFindOne: Purchase.findOne,
    purchaseFindById: Purchase.findById,
    stockMovementInsertMany: StockMovement.insertMany,
  };

  const supplier = { _id: 'supplier-1', name: 'Agri Wholesale' };
  const product = {
    _id: 'product-1',
    name: 'Urea',
    unitType: 'Bag',
    stockQuantity: 5,
    currentStock: 5,
    saveCount: 0,
    save: async function save() {
      this.saveCount += 1;
      return this;
    },
  };
  let purchase;
  let movementRows = [];

  Supplier.findOne = () => makeQuery(supplier);
  Product.findOne = (filter) => makeQuery(filter._id === 'product-1' ? product : null);
  Purchase.create = async (payload) => {
    purchase = {
      _id: 'purchase-1',
      ...payload,
      stockApplied: false,
      saveCount: 0,
      save: async function save() {
        this.saveCount += 1;
        return this;
      },
    };
    return purchase;
  };
  Purchase.findOne = () => makeQuery(purchase);
  Purchase.findById = () => makeQuery(purchase);
  StockMovement.insertMany = async (rows) => {
    movementRows = movementRows.concat(rows);
    return rows;
  };

  try {
    const req = {
      body: {
        supplierId: 'supplier-1',
        status: 'RECEIVED',
        items: [{ productId: 'product-1', quantity: 4, purchasePrice: 900, sellingPrice: 1100, gstRate: 5, batchNumber: 'B1', expiryDate: '2027-01-01' }],
      },
      headers: {},
      storeId: 'store-1',
      user: { role: 'ADMIN', userId: 'admin-1' },
    };
    const res = makeResponse();
    await createPurchase(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(product.stockQuantity, 9);
    assert.equal(product.purchasePrice, 900);
    assert.equal(product.sellingPrice, 1100);
    assert.equal(product.batchNumber, 'B1');
    assert.equal(product.supplierId, 'supplier-1');
    assert.equal(purchase.stockApplied, true);
    assert.equal(movementRows.length, 1);
    assert.equal(movementRows[0].type, 'PURCHASE_IN');
    assert.equal(movementRows[0].previousStock, 5);
    assert.equal(movementRows[0].newStock, 9);

    await updatePurchaseStatus({
      params: { id: 'purchase-1' },
      body: { status: 'RECEIVED' },
      headers: {},
      storeId: 'store-1',
      user: { role: 'ADMIN', userId: 'admin-1' },
    }, makeResponse());

    assert.equal(product.stockQuantity, 9);
    assert.equal(movementRows.length, 1);
  } finally {
    Supplier.findOne = originals.supplierFindOne;
    Product.findOne = originals.productFindOne;
    Purchase.create = originals.purchaseCreate;
    Purchase.findOne = originals.purchaseFindOne;
    Purchase.findById = originals.purchaseFindById;
    StockMovement.insertMany = originals.stockMovementInsertMany;
  }
});
