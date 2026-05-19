import assert from 'node:assert/strict';
import test from 'node:test';
import { getOwnerFilter } from '../src/utils/ownership.js';

test('owner filter includes admin and selected store', () => {
  const filter = getOwnerFilter({
    user: { role: 'ADMIN', userId: 'admin-a' },
    storeId: 'store-a',
  });
  assert.deepEqual(filter, { adminId: 'admin-a', storeId: 'store-a' });
});

test('owner filter rejects requests without a store context', () => {
  assert.throws(
    () => getOwnerFilter({ user: { role: 'ADMIN', userId: 'admin-a' } }),
    /Store ownership context is missing/
  );
});
