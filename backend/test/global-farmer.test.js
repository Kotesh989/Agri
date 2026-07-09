import assert from 'node:assert/strict';
import test from 'node:test';
import { login } from '../src/controllers/authController.js';
import { createCustomer } from '../src/controllers/customerController.js';
import { listInvoices as listAdminInvoices } from '../src/controllers/invoiceController.js';
import {
  getInvoice as getFarmerInvoice,
  listInvoices as listFarmerInvoices,
  listShopInvoices,
  listShopProducts,
  listShops,
} from '../src/controllers/farmerController.js';
import { Customer, CustomerPurchasedItem, FarmerStoreLink, Invoice, Product, User, Store } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';

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
  cookie(name, value) {
    this.cookies ||= {};
    this.cookies[name] = value;
    return this;
  },
});

const makeInvoiceQuery = (result) => ({
  sort() {
    return this;
  },
  populate() {
    return this;
  },
  select() {
    return this;
  },
  then(resolve) {
    return Promise.resolve(result).then(resolve);
  },
});

const mockLinkedCustomers = (customers = []) => {
  const originalFind = Customer.find;
  Customer.find = () => makeInvoiceQuery(customers);
  return () => {
    Customer.find = originalFind;
  };
};

test('same farmer phone can be added by two admins and links to one farmer user', async () => {
  const originals = {
    customerFindOne: Customer.findOne,
    customerCreate: Customer.create,
    userFindOne: User.findOne,
    userCreate: User.create,
    linkFindOneAndUpdate: FarmerStoreLink.findOneAndUpdate,
  };

  const farmer = { _id: 'farmer-global-1', id: 'farmer-global-1', save: async () => farmer };
  const createdCustomers = [];
  let userCreateCount = 0;

  Customer.findOne = async () => null;
  Customer.create = async (payload) => {
    createdCustomers.push(payload);
    return { ...payload, _id: `customer-${createdCustomers.length}`, id: `customer-${createdCustomers.length}` };
  };
  User.findOne = async (filter) => {
    if (filter.username) return null;
    if (filter.email) return null;
    return userCreateCount === 0 ? null : farmer;
  };
  User.create = async () => {
    userCreateCount += 1;
    return farmer;
  };
  FarmerStoreLink.findOneAndUpdate = async () => ({ id: 'link-1' });

  try {
    const reqA = {
      body: { name: 'Ravi', username: 'ravi123', mobileNumber: '9999999999', email: 'ravi@example.com', state: 'Karnataka', district: 'Davangere', taluk: 'Davangere', village: 'Davangere', pinCode: '577001' },
      headers: {},
      storeId: 'store-a',
      user: { role: 'ADMIN', userId: 'admin-a' },
    };
    const reqB = {
      body: { name: 'Ravi', username: 'ravi123', mobileNumber: '9999999999', email: 'ravi@example.com', state: 'Karnataka', district: 'Davangere', taluk: 'Davangere', village: 'Davangere', pinCode: '577001' },
      headers: {},
      storeId: 'store-b',
      user: { role: 'ADMIN', userId: 'admin-b' },
    };

    const resA = makeResponse();
    const resB = makeResponse();
    await createCustomer(reqA, resA);
    await createCustomer(reqB, resB);

    assert.equal(resA.statusCode, 201);
    assert.equal(resB.statusCode, 201);
    assert.equal(userCreateCount, 1);
    assert.equal(createdCustomers.length, 2);
    assert.equal(String(createdCustomers[0].farmerUserId), 'farmer-global-1');
    assert.equal(String(createdCustomers[1].farmerUserId), 'farmer-global-1');
    assert.equal(createdCustomers[0].adminId, 'admin-a');
    assert.equal(createdCustomers[1].adminId, 'admin-b');
  } finally {
    Customer.findOne = originals.customerFindOne;
    Customer.create = originals.customerCreate;
    User.findOne = originals.userFindOne;
    User.create = originals.userCreate;
    FarmerStoreLink.findOneAndUpdate = originals.linkFindOneAndUpdate;
  }
});

test('customer creation links existing farmer by email instead of creating duplicate user', async () => {
  const originals = {
    customerFindOne: Customer.findOne,
    customerCreate: Customer.create,
    userFindOne: User.findOne,
    userCreate: User.create,
    linkFindOneAndUpdate: FarmerStoreLink.findOneAndUpdate,
  };

  const farmer = {
    _id: 'farmer-email-1',
    id: 'farmer-email-1',
    email: 'ravi@example.com',
    mobileNumber: '9999999999',
    role: 'FARMER',
    save: async () => farmer,
  };
  let userCreateCalled = false;
  let capturedCustomer;

  Customer.findOne = async () => null;
  Customer.create = async (payload) => {
    capturedCustomer = payload;
    return { ...payload, _id: 'customer-email-1', id: 'customer-email-1' };
  };
  User.findOne = async (filter) => {
    if (filter.email === 'ravi@example.com') return farmer;
    if (filter.role === 'FARMER' && filter.$or?.some((condition) => condition.email === 'ravi@example.com')) return farmer;
    return null;
  };
  User.create = async () => {
    userCreateCalled = true;
    return farmer;
  };
  FarmerStoreLink.findOneAndUpdate = async () => ({ id: 'link-email-1' });

  try {
    const res = makeResponse();
    await createCustomer({
      body: { name: 'Ravi', username: 'ravi123', mobileNumber: '8888888888', email: 'Ravi@Example.com', state: 'Karnataka', district: 'Davangere', taluk: 'Davangere', village: 'Davangere', pinCode: '577001' },
      headers: {},
      storeId: 'store-a',
      user: { role: 'ADMIN', userId: 'admin-a' },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(userCreateCalled, false);
    assert.equal(String(capturedCustomer.farmerUserId), 'farmer-email-1');
    assert.equal(capturedCustomer.email, 'ravi@example.com');
  } finally {
    Customer.findOne = originals.customerFindOne;
    Customer.create = originals.customerCreate;
    User.findOne = originals.userFindOne;
    User.create = originals.userCreate;
    FarmerStoreLink.findOneAndUpdate = originals.linkFindOneAndUpdate;
  }
});

test('farmer can login with email and password through shared login endpoint', async () => {
  const originalFindOne = User.findOne;
  const password = 'Farmer@123';
  const farmer = {
    id: 'farmer-global-1',
    _id: 'farmer-global-1',
    email: 'farmer@example.com',
    mobileNumber: '9999999999',
    password: await hashPassword(password),
    name: 'Ravi Farmer',
    role: 'FARMER',
    isActive: true,
    isPhoneVerified: false,
  };
  let capturedFilter;
  User.findOne = async (filter) => {
    capturedFilter = filter;
    return farmer;
  };

  try {
    const res = makeResponse();
    await login({ body: { email: 'farmer@example.com', password } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.user.role, 'FARMER');
    assert.equal(res.body.data.user.email, 'farmer@example.com');
    assert.ok(res.body.data.token);
    assert.ok(capturedFilter.$or.some((condition) => condition.email === 'farmer@example.com'));
  } finally {
    User.findOne = originalFindOne;
  }
});

test('farmer invoice list is scoped by farmerUserId and can include multiple shops', async () => {
  const originalFind = Invoice.find;
  const restoreCustomers = mockLinkedCustomers();
  let capturedFilter;
  Invoice.find = (filter) => {
    capturedFilter = filter;
    return makeInvoiceQuery([
      { id: 'inv-a', invoiceNumber: 'INV-A', storeSnapshot: { storeName: 'Shop A' }, items: [] },
      { id: 'inv-b', invoiceNumber: 'INV-B', storeSnapshot: { storeName: 'Shop B' }, items: [] },
    ]);
  };

  try {
    const res = makeResponse();
    await listFarmerInvoices({ user: { userId: 'farmer-global-1', role: 'FARMER' } }, res);
    assert.deepEqual(capturedFilter, { $or: [{ farmerUserId: 'farmer-global-1' }] });
    assert.deepEqual(res.body.data.map((invoice) => invoice.storeName), ['Shop A', 'Shop B']);
  } finally {
    Invoice.find = originalFind;
    restoreCustomers();
  }
});

test('farmer sees shops from multiple admins with shop totals', async () => {
  const originalFind = Invoice.find;
  const originalStoreFind = Store.find;
  const restoreCustomers = mockLinkedCustomers();
  Invoice.find = () => makeInvoiceQuery([
    {
      id: 'inv-a',
      storeId: { id: 'store-a', name: 'Shop A', ownerName: 'Owner A', mobileNumber: '111' },
      storeSnapshot: { storeName: 'Shop A', ownerName: 'Owner A', phone: '111' },
      invoiceDate: new Date('2026-05-01'),
      totalAmount: 100,
      paidAmount: 80,
      balanceDue: 20,
    },
    {
      id: 'inv-b',
      storeId: { id: 'store-b', name: 'Shop B', ownerName: 'Owner B', mobileNumber: '222' },
      storeSnapshot: { storeName: 'Shop B', ownerName: 'Owner B', phone: '222' },
      invoiceDate: new Date('2026-05-02'),
      totalAmount: 200,
      paidAmount: 200,
      balanceDue: 0,
    },
  ]);
  Store.find = () => makeInvoiceQuery([
    { _id: 'store-a', name: 'Shop A', ownerName: 'Owner A', mobileNumber: '111' },
    { _id: 'store-b', name: 'Shop B', ownerName: 'Owner B', mobileNumber: '222' },
  ]);

  try {
    const res = makeResponse();
    await listShops({ user: { userId: 'farmer-global-1', role: 'FARMER' } }, res);
    assert.equal(res.body.data.length, 2);
    assert.deepEqual(res.body.data.map((shop) => shop.storeName).sort(), ['Shop A', 'Shop B']);
    const shopA = res.body.data.find(s => s.storeName === 'Shop A');
    assert.equal(shopA?.pendingBalance, 20);
  } finally {
    Invoice.find = originalFind;
    Store.find = originalStoreFind;
    restoreCustomers();
  }
});

test('farmer store list falls back to store or admin name when old invoice has no store snapshot', async () => {
  const originalFind = Invoice.find;
  const originalStoreFind = Store.find;
  const restoreCustomers = mockLinkedCustomers();
  Invoice.find = () => makeInvoiceQuery([
    {
      id: 'old-inv-a',
      storeId: { id: 'store-a', name: 'Legacy Store Name', ownerName: 'Store Owner', mobileNumber: '111' },
      adminId: { id: 'admin-a', name: 'Admin A', mobileNumber: '999' },
      invoiceDate: new Date('2026-05-01'),
      totalAmount: 100,
      paidAmount: 50,
      balanceDue: 50,
    },
    {
      id: 'old-inv-b',
      storeId: null,
      adminId: { id: 'admin-b', name: 'Admin Fallback Store', mobileNumber: '888' },
      invoiceDate: new Date('2026-05-02'),
      totalAmount: 200,
      paidAmount: 150,
      balanceDue: 50,
    },
  ]);
  Store.find = () => makeInvoiceQuery([]);

  try {
    const res = makeResponse();
    await listShops({ user: { userId: 'farmer-global-1', role: 'FARMER' } }, res);
    assert.deepEqual(res.body.data.map((shop) => shop.storeName).sort(), ['Admin Fallback Store', 'Legacy Store Name']);
    assert.deepEqual(res.body.data.map((shop) => shop.phone).sort(), ['111', '888']);
  } finally {
    Invoice.find = originalFind;
    Store.find = originalStoreFind;
    restoreCustomers();
  }
});

test('farmer store list includes old invoices linked through farmer customer records', async () => {
  const originalFind = Invoice.find;
  const originalManualFind = CustomerPurchasedItem.find;
  const originalStoreFind = Store.find;
  const linkedCustomerId = '64b000000000000000000001';
  const restoreCustomers = mockLinkedCustomers([{ _id: linkedCustomerId }]);
  let capturedFilter;
  Invoice.find = (filter) => {
    capturedFilter = filter;
    return makeInvoiceQuery([
      {
        id: 'old-linked-inv',
        customerId: linkedCustomerId,
        storeId: { id: 'store-linked', name: 'Linked Customer Store' },
        adminId: { id: 'admin-linked', name: 'Linked Admin' },
        invoiceDate: new Date('2026-05-03'),
        totalAmount: 300,
        paidAmount: 100,
        balanceDue: 200,
      },
    ]);
  };
  CustomerPurchasedItem.find = () => makeInvoiceQuery([]);
  Store.find = () => makeInvoiceQuery([
    { _id: 'store-linked', name: 'Linked Customer Store' },
  ]);

  try {
    const res = makeResponse();
    await listShops({ user: { userId: 'farmer-global-1', role: 'FARMER' } }, res);
    assert.deepEqual(capturedFilter, {
      $or: [
        { farmerUserId: 'farmer-global-1' },
        { customerId: { $in: [linkedCustomerId] } },
      ],
    });
    assert.equal(res.body.data[0].storeName, 'Linked Customer Store');
    assert.equal(res.body.data[0].totalBalance, 200);
  } finally {
    Invoice.find = originalFind;
    CustomerPurchasedItem.find = originalManualFind;
    Store.find = originalStoreFind;
    restoreCustomers();
  }
});


test('farmer sees products only from shops where he purchased', async () => {
  const originals = { invoiceFindOne: Invoice.findOne, productFind: Product.find };
  const restoreCustomers = mockLinkedCustomers();
  let capturedProductFilter;

  Invoice.findOne = (filter) => {
    if (filter.storeId === 'store-a') return makeInvoiceQuery({ id: 'invoice-a' });
    return makeInvoiceQuery(null);
  };
  Product.find = (filter) => {
    capturedProductFilter = filter;
    return makeInvoiceQuery([
      {
        id: 'product-a',
        name: 'DAP',
        brandName: 'Brand',
        category: 'FERTILIZER',
        stockQuantity: 12,
        unitType: 'Bag',
        pricePerUnit: 1200,
        gstRate: 5,
      },
    ]);
  };

  try {
    const allowedRes = makeResponse();
    await listShopProducts({
      params: { storeId: 'store-a' },
      query: {},
      user: { role: 'FARMER', userId: 'farmer-global-1' },
    }, allowedRes);
    assert.equal(allowedRes.statusCode, 200);
    assert.deepEqual(capturedProductFilter, { storeId: 'store-a' });
    assert.equal(allowedRes.body.data[0].purchasePrice, undefined);
    assert.equal(allowedRes.body.data[0].supplierId, undefined);

    const deniedRes = makeResponse();
    await listShopProducts({
      params: { storeId: 'store-b' },
      query: {},
      user: { role: 'FARMER', userId: 'farmer-global-1' },
    }, deniedRes);
    assert.equal(deniedRes.statusCode, 200);
  } finally {
    Invoice.findOne = originals.invoiceFindOne;
    Product.find = originals.productFind;
    restoreCustomers();
  }
});

test('farmer cannot see store invoices when he has no invoices in that store', async () => {
  const originalFind = Invoice.find;
  const restoreCustomers = mockLinkedCustomers();
  let capturedFilter;
  Invoice.find = (filter) => {
    capturedFilter = filter;
    return makeInvoiceQuery([]);
  };

  try {
    const res = makeResponse();
    await listShopInvoices({
      params: { storeId: 'store-without-purchases' },
      user: { role: 'FARMER', userId: 'farmer-global-1' },
    }, res);
    assert.deepEqual(capturedFilter, { storeId: 'store-without-purchases', $or: [{ farmerUserId: 'farmer-global-1' }] });
    assert.equal(res.statusCode, 403);
  } finally {
    Invoice.find = originalFind;
    restoreCustomers();
  }
});

test('admin invoice list remains scoped to selected admin store', async () => {
  const originalFind = Invoice.find;
  let capturedFilter;
  Invoice.find = (filter) => {
    capturedFilter = filter;
    return makeInvoiceQuery([]);
  };

  try {
    const res = makeResponse();
    await listAdminInvoices({
      query: {},
      storeId: 'store-a',
      user: { role: 'ADMIN', userId: 'admin-a' },
    }, res);
    assert.equal(capturedFilter.adminId, 'admin-a');
    assert.equal(capturedFilter.storeId, 'store-a');
  } finally {
    Invoice.find = originalFind;
  }
});

test('farmer invoice detail rejects invoices not linked to that farmer', async () => {
  const originalFindOne = Invoice.findOne;
  const restoreCustomers = mockLinkedCustomers();
  let capturedFilter;
  Invoice.findOne = (filter) => {
    capturedFilter = filter;
    return makeInvoiceQuery(null);
  };

  try {
    const res = makeResponse();
    await getFarmerInvoice({
      params: { id: 'other-invoice' },
      user: { role: 'FARMER', userId: 'farmer-global-1' },
    }, res);
    assert.deepEqual(capturedFilter, { _id: 'other-invoice', $or: [{ farmerUserId: 'farmer-global-1' }] });
    assert.equal(res.statusCode, 404);
  } finally {
    Invoice.findOne = originalFindOne;
    restoreCustomers();
  }
});
