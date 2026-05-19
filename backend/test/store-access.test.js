import assert from 'node:assert/strict';
import test from 'node:test';
import { requireStoreAccess } from '../src/middleware/auth.js';
import { FarmerStoreLink, Store } from '../src/models/index.js';

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

test('admin is denied when store is not owned by the admin', async () => {
  const originalFindOne = Store.findOne;
  Store.findOne = async () => null;
  const req = { headers: { 'x-store-id': 'store-b' }, user: { role: 'ADMIN', userId: 'admin-a' } };
  const res = makeResponse();
  let nextCalled = false;
  await requireStoreAccess(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
  Store.findOne = originalFindOne;
});

test('linked farmer may access selected store', async () => {
  const originalFindOne = FarmerStoreLink.findOne;
  FarmerStoreLink.findOne = async () => ({ id: 'link-1' });
  const req = { headers: { 'x-store-id': 'store-a' }, user: { role: 'FARMER', userId: 'farmer-a' } };
  const res = makeResponse();
  let nextCalled = false;
  await requireStoreAccess(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.storeId, 'store-a');
  FarmerStoreLink.findOne = originalFindOne;
});
