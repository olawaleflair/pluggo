import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccountLookup } from './accountLookup.js';
const bank = { name: 'OPay Digital Services Limited (OPay)', code: '999992', active: true };
const success = data => ({ ok: true, status: 200, json: async () => ({ status: true, data }) });
function provider(counter, override) {
  return async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer sk_test_fake');
    assert.ok(options.signal);
    const parsed = new URL(url);
    if (parsed.pathname === '/bank') { counter.banks++; return success([bank]); }
    counter.resolve++;
    assert.equal(parsed.searchParams.get('bank_code'), '999992');
    return success(override || { account_number: parsed.searchParams.get('account_number'), account_name: 'SAMPLE RECIPIENT' });
  };
}
test('unconfigured lookup provides an explicitly simulated name without an external call', async () => {
  const lookup = createAccountLookup({ key: '', fetchImpl: () => { throw new Error('No external calls'); } });
  const result = await lookup.resolve('OPay', '0123456789', 'u');
  assert.equal(result.accountNameSource, 'demo'); assert.equal(result.recipientName, 'Demo Recipient 6789');
  await assert.rejects(lookup.resolve('OPay', '123', 'u'), error => error.status === 400);
});
test('Paystack test lookup maps banks, preserves leading zeroes and caches by user and account', async () => {
  const counter = { banks: 0, resolve: 0 };
  let time = Date.UTC(2026, 9, 5);
  const lookup = createAccountLookup({ key: 'sk_test_fake', fetchImpl: provider(counter), now: () => time });
  const result = await lookup.resolve('OPay', '0123456789', 'u');
  assert.equal(result.recipientName, 'SAMPLE RECIPIENT'); assert.equal(result.accountNameSource, 'paystack-test');
  assert.equal(result.accountNumber, '0123456789');
  await lookup.resolve('OPay', '0123456789', 'u'); assert.deepEqual(counter, { banks: 1, resolve: 1 });
  await lookup.resolve('OPay', '0123456789', 'another-user'); assert.equal(counter.resolve, 2);
  time += 600001;
  await lookup.resolve('OPay', '0123456789', 'u'); assert.equal(counter.resolve, 3); assert.equal(counter.banks, 1);
});
test('concurrent identical lookups share one provider call', async () => {
  const counter = { banks: 0, resolve: 0 };
  const lookup = createAccountLookup({ key: 'sk_test_fake', fetchImpl: provider(counter) });
  const results = await Promise.all(Array.from({ length: 5 }, () => lookup.resolve('OPay', '0123456789', 'u')));
  assert.equal(counter.resolve, 1); assert.equal(counter.banks, 1);
  assert.ok(results.every(result => result.recipientName === 'SAMPLE RECIPIENT'));
});
test('cursor bank pages are followed and account errors do not become demo names', async () => {
  let pages = 0;
  const lookup = createAccountLookup({ key: 'sk_test_fake', fetchImpl: async url => {
    const parsed = new URL(url);
    if (parsed.pathname === '/bank') {
      pages++;
      if (!parsed.searchParams.get('next')) return { ok: true, status: 200, json: async () => ({ status: true, data: [], meta: { next: 'page-two' } }) };
      assert.equal(parsed.searchParams.get('next'), 'page-two'); return success([bank]);
    }
    return { ok: false, status: 422, json: async () => ({ status: false, message: 'provider detail must stay private' }) };
  } });
  await assert.rejects(lookup.resolve('OPay', '0123456789', 'u'), error => error.status === 400 && !error.message.includes('provider detail'));
  assert.equal(pages, 2);
});
test('provider failure, timeout, wrong account and malformed names fail closed', async () => {
  for (const fetchImpl of [
    async () => { throw new DOMException('Timeout', 'TimeoutError'); },
    async () => ({ ok: false, status: 401, json: async () => ({ status: false }) }),
    async () => ({ ok: false, status: 429, json: async () => ({ status: false }) }),
    provider({ banks: 0, resolve: 0 }, { account_number: '9999999999', account_name: 'Wrong' }),
    provider({ banks: 0, resolve: 0 }, { account_number: '0123456789', account_name: '' }),
  ]) {
    const lookup = createAccountLookup({ key: 'sk_test_fake', fetchImpl });
    await assert.rejects(lookup.resolve('OPay', '0123456789', 'u'), error => [429, 503].includes(error.status));
  }
});
test('lookup rate limits apply before extra requests and recover after the window', async () => {
  let time = Date.UTC(2026, 9, 5), calls = 0;
  const lookup = createAccountLookup({ key: 'sk_test_fake', now: () => time, fetchImpl: async () => { calls++; return { ok: false, status: 400, json: async () => ({ status: false }) }; } });
  for (let i = 0; i < 10; i++) await assert.rejects(lookup.resolve('OPay', String(i).padStart(10, '0'), 'u'), error => error.status === 400);
  await assert.rejects(lookup.resolve('OPay', '0123456789', 'u'), error => error.status === 429);
  assert.equal(calls, 10);
  time += 60000;
  await assert.rejects(lookup.resolve('OPay', '0123456789', 'u'), error => error.status === 400);
  assert.equal(calls, 11);
});

test('Paystack test-mode daily bank allowance is explained separately from temporary throttling', async () => {
  let calls = 0;
  const lookup = createAccountLookup({ key: 'sk_test_fake', fetchImpl: async url => {
    if (new URL(url).pathname === '/bank') return success([bank]);
    calls++;
    return { ok: false, status: 429, json: async () => ({ status: false, message: 'Test mode daily limit of 3 live bank resolves exceeded. Use test bank codes 001 or upgrade to live mode.' }) };
  } });
  await assert.rejects(lookup.resolve('OPay', '0123456789', 'u'), error => error.status === 503 && /daily limit/.test(error.message) && !/Paystack/i.test(error.message) && !/minute/.test(error.message));
  assert.equal(calls, 1);
});
