import assert from 'node:assert/strict';
import test from 'node:test';
import { getGstReport, getProfitReport } from '../src/controllers/dashboardController.js';
import { Invoice } from '../src/models/index.js';

class QueryStub {
  constructor(docs) {
    this.docs = docs;
  }

  populate() {
    return this;
  }

  sort() {
    return this;
  }

  then(resolve) {
    return Promise.resolve(this.docs).then(resolve);
  }
}

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

const makeRequest = () => ({
  user: { role: 'ADMIN', userId: 'admin-a' },
  storeId: 'store-a',
  query: {},
});

test('profit report returns product-level profit rows', async () => {
  const originalFind = Invoice.find;
  Invoice.find = () => new QueryStub([
    {
      items: [
        {
          quantity: 2,
          unitPrice: 120,
          gstAmount: 12,
          product: { name: 'DAP', purchasePrice: 90 },
        },
      ],
    },
  ]);

  const res = makeResponse();
  await getProfitReport(makeRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.rows[0].productName, 'DAP');
  assert.equal(res.body.data.rows[0].profitAmount, 60);
  assert.equal(res.body.data.rows[0].profitPercentage, 25);

  Invoice.find = originalFind;
});

test('GST report splits invoice GST into CGST and SGST rows', async () => {
  const originalFind = Invoice.find;
  Invoice.find = () => new QueryStub([
    {
      id: 'invoice-a',
      invoiceNumber: 'INV-1',
      invoiceDate: new Date('2026-05-01T00:00:00.000Z'),
      items: [
        {
          id: 'item-a',
          totalPrice: 1000,
          gstPercentage: 18,
          gstAmount: 180,
          product: { name: 'Urea' },
        },
      ],
    },
  ]);

  const res = makeResponse();
  await getGstReport(makeRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data[0].invoiceNumber, 'INV-1');
  assert.equal(res.body.data[0].cgst, 90);
  assert.equal(res.body.data[0].sgst, 90);
  assert.equal(res.body.data[0].grandTotal, 1180);

  Invoice.find = originalFind;
});
