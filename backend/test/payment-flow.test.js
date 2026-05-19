import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { recordPayment } from '../src/controllers/paymentController.js';
import { Customer, Invoice, Payment } from '../src/models/index.js';

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

test('record payment rejects missing or invalid invoice id with clear 400', async () => {
  const res = makeResponse();
  await recordPayment({
    body: { invoiceId: '', customerId: new mongoose.Types.ObjectId().toString(), amountPaid: 100, paymentMethod: 'CASH' },
    headers: {},
    storeId: new mongoose.Types.ObjectId().toString(),
    user: { role: 'ADMIN', userId: new mongoose.Types.ObjectId().toString() },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Invoice ID is required');
});

test('record payment clears invoice due and customer outstanding balance', async () => {
  const originals = {
    invoiceFindOne: Invoice.findOne,
    customerFindOne: Customer.findOne,
    paymentCreate: Payment.create,
    paymentFindById: Payment.findById,
  };

  const adminId = new mongoose.Types.ObjectId();
  const storeId = new mongoose.Types.ObjectId();
  const invoiceId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const invoice = {
    _id: invoiceId,
    id: invoiceId.toString(),
    adminId,
    storeId,
    customerId,
    invoiceNumber: 'INV-1',
    totalAmount: 1000,
    paidAmount: 200,
    amountPaid: 200,
    balanceDue: 800,
    dueAmount: 800,
    status: 'PARTIAL',
    paymentStatus: 'PARTIAL',
    save: async function save() {
      return this;
    },
  };
  const customer = {
    _id: customerId,
    id: customerId.toString(),
    totalCredit: 800,
    save: async function save() {
      return this;
    },
  };
  let createdPayment;

  Invoice.findOne = (filter) => makeQuery(String(filter._id) === String(invoiceId) ? invoice : null);
  Customer.findOne = (filter) => makeQuery(String(filter._id) === String(customerId) ? customer : null);
  Payment.create = async (payload) => {
    createdPayment = { _id: new mongoose.Types.ObjectId(), ...payload };
    return createdPayment;
  };
  Payment.findById = () => makeQuery(createdPayment);

  try {
    const res = makeResponse();
    await recordPayment({
      body: { invoiceId: invoiceId.toString(), customerId: customerId.toString(), amountPaid: 800, paymentMethod: 'CASH', note: 'Clear due' },
      headers: {},
      storeId: storeId.toString(),
      user: { role: 'ADMIN', userId: adminId.toString() },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createdPayment.amount, 800);
    assert.equal(invoice.paidAmount, 1000);
    assert.equal(invoice.amountPaid, 1000);
    assert.equal(invoice.balanceDue, 0);
    assert.equal(invoice.dueAmount, 0);
    assert.equal(invoice.status, 'PAID');
    assert.equal(invoice.paymentStatus, 'PAID');
    assert.ok(invoice.paidAt instanceof Date);
    assert.equal(customer.totalCredit, 0);
  } finally {
    Invoice.findOne = originals.invoiceFindOne;
    Customer.findOne = originals.customerFindOne;
    Payment.create = originals.paymentCreate;
    Payment.findById = originals.paymentFindById;
  }
});
