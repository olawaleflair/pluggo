import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { demoBeneficiaries } from './demoBeneficiaries.js';
import worker, { cleanup, reserveQuota } from './index.js';

function environment() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('./migrations/0001_public_demo.sql', import.meta.url), 'utf8'));
  const DB = {
    prepare(query) {
      let values = [];
      return { bind(...input) { values = input; return this; }, async first() { return sql.prepare(query).get(...values) || null; }, async all() { return { results: sql.prepare(query).all(...values) }; }, async run() { const result = sql.prepare(query).run(...values); return { success: true, meta: { changes: result.changes } }; } };
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sql.exec('COMMIT'); return results; }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
  return { DB, sql, ASSETS: { fetch: () => new Response('app') } };
}
async function request(env, path, data, token, headers = {}) {
  const response = await worker.fetch(new Request(`https://demo.example/api${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), env);
  return { status: response.status, ...await response.json() };
}
test('public visitors are private, start at 157k and expire without importing local accounts', async () => {
  const env = environment();
  const one = await request(env, '/auth/demo', {}), two = await request(env, '/auth/demo', {});
  assert.equal(one.user.walletBalance, 157000); assert.notEqual(one.user.id, two.user.id);
  assert.notEqual(one.token, two.token); assert.equal(one.user.demo, true);
  assert.equal(env.sql.prepare('SELECT count(*) AS count FROM visitors').get().count, 2);
  assert.equal(env.sql.prepare('SELECT token FROM sessions WHERE userId = ?').get(one.user.id).token.includes(one.token), false, 'session token is hashed at rest');
  assert.equal((await request(env, '/auth/signin', { email: 'olawale@example.com', password: 'Password123!' })).status, 403);
  assert.equal((await request(env, '/transactions')).status, 401);
  const savedOne = (await request(env, '/beneficiaries', undefined, one.token)).beneficiaries;
  assert.equal(savedOne[0].sample, 1);
  assert.equal((await request(env, '/beneficiaries/delete', { id: savedOne[0].id }, two.token)).status, 404);
  env.sql.prepare('UPDATE visitors SET expires = 0 WHERE id = ?').run(one.user.id);
  assert.equal((await request(env, '/auth/session', undefined, one.token)).status, 401);
  await cleanup(env);
  assert.equal(env.sql.prepare('SELECT count(*) AS count FROM sessions WHERE userId = ?').get(one.user.id).count, 0);
  assert.equal((await request(env, '/auth/session', undefined, two.token)).status, 200);
});
test('shared quotas rollback all reservations when any limit is exhausted', async () => {
  const env = environment();
  await reserveQuota(env, [['test:user', 1, 60000], ['test:global', 10, 60000]]);
  await assert.rejects(reserveQuota(env, [['test:global', 10, 60000], ['test:user', 1, 60000]]), error => error.status === 429);
  assert.equal(env.sql.prepare("SELECT count FROM quotas WHERE key LIKE 'test:global:%'").get().count, 1);
});
test('sample transfers resolve without a provider, confirmation is atomic and replay does not debit twice', async () => {
  const env = environment(), visitor = await request(env, '/auth/demo', {});
  const draft = (await request(env, '/payment-drafts', { text: 'Send 5k to Thomas' }, visitor.token)).draft;
  assert.equal(draft.recipientName, 'Demo Thomas'); assert.equal(draft.accountNameSource, 'demo');
  const body = { ...draft, pin: '1234', requestId: 'sample-transfer-0001' };
  const results = await Promise.all([request(env, '/payments/confirm', body, visitor.token), request(env, '/payments/confirm', body, visitor.token)]);
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.equal(results[0].transaction.id, results[1].transaction.id);
  assert.equal((await request(env, '/auth/session', undefined, visitor.token)).user.walletBalance, 152000);
  assert.equal((await request(env, '/transactions', undefined, visitor.token)).transactions.length, 1);
  assert.equal((await request(env, '/payments/confirm', { ...body, amount: 6000 }, visitor.token)).status, 409);
  env.sql.prepare('UPDATE account_resolutions SET expiresAt = 0').run();
  assert.equal((await request(env, '/payments/confirm', body, visitor.token)).status, 200, 'replay survives lookup expiry');
  assert.equal((await request(env, '/payments/confirm', { ...body, requestId: 'sample-transfer-0002' }, visitor.token)).status, 400);
});
test('simultaneous withdrawals cannot overdraw and failed ledger insert rolls back its wallet debit', async () => {
  const env = environment(), visitor = await request(env, '/auth/demo', {});
  const airtime = { type: 'Airtime', amount: 100000, phone: '08012345678', provider: 'MTN', pin: '1234' };
  const results = await Promise.all(['a', 'b'].map(suffix => request(env, '/payments/confirm', { ...airtime, requestId: `concurrent-payment-${suffix}` }, visitor.token)));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
  assert.equal((await request(env, '/auth/session', undefined, visitor.token)).user.walletBalance, 57000);
  env.sql.exec("CREATE TRIGGER reject_test_ledger BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT, 'test_reject'); END;");
  assert.equal((await request(env, '/payments/confirm', { ...airtime, amount: 10, requestId: 'ledger-rollback-0001' }, visitor.token)).status, 400); // minimum airtime validation
  assert.equal((await request(env, '/payments/confirm', { ...airtime, amount: 100, requestId: 'ledger-rollback-0002' }, visitor.token)).status, 503);
  assert.equal((await request(env, '/auth/session', undefined, visitor.token)).user.walletBalance, 57000);
  assert.equal((await request(env, '/transactions', undefined, visitor.token)).transactions.length, 1);
});
test('transfer proof is bound to visitor, bank and recipient and cannot be supplied by the browser', async () => {
  const env = environment(), one = await request(env, '/auth/demo', {}), two = await request(env, '/auth/demo', {});
  const draft = (await request(env, '/payment-drafts', { text: 'Send 5k to Thomas' }, one.token)).draft;
  const body = { ...draft, pin: '1234', requestId: 'proof-check-00001' };
  for (const [patch, token] of [[{ recipientName: 'Forged' }, one.token], [{ bank: 'UBA' }, one.token], [{ accountResolutionId: '' }, one.token], [{}, two.token]]) {
    assert.ok((await request(env, '/payments/confirm', { ...body, ...patch }, token)).status >= 400);
  }
  assert.equal((await request(env, '/auth/session', undefined, one.token)).user.walletBalance, 157000);
});
test('reset removes visitor data without clearing abuse quotas or another visitor history', async () => {
  const env = environment(), one = await request(env, '/auth/demo', {}), two = await request(env, '/auth/demo', {});
  await request(env, '/wallet/fund', { amount: 1000 }, one.token); await request(env, '/wallet/fund', { amount: 2000 }, two.token);
  const result = await request(env, '/demo/reset', {}, one.token);
  assert.equal(result.user.walletBalance, 157000); assert.deepEqual(result.transactions, []); assert.equal(result.beneficiaries.length, demoBeneficiaries.length);
  assert.equal((await request(env, '/auth/session', undefined, two.token)).user.walletBalance, 159000);
  assert.equal((await request(env, '/transactions', undefined, two.token)).transactions.length, 1);
  assert.ok(env.sql.prepare('SELECT count(*) AS count FROM quotas').get().count > 0);
  assert.equal((await request(env, '/wallet/fund', { amount: 100 }, one.token, { Origin: 'https://other.example' })).status, 403);
});

test('sample names and family nicknames resolve privately without contacting Paystack', async () => {
  const env = environment(), visitor = await request(env, '/auth/demo', {});
  // A configured provider must still leave fictional samples on the demo path.
  env.PAYSTACK_SECRET_KEY = 'sk_live_test_only_not_a_real_key';
  const samples = (await request(env, '/beneficiaries', undefined, visitor.token)).beneficiaries;
  assert.equal(samples.length, demoBeneficiaries.length);
  for (const item of demoBeneficiaries) {
    for (const name of [item.name, item.nickname]) {
      const result = await request(env, '/payment-drafts', { text: `Please send 5k to ${name}` }, visitor.token);
      assert.equal(result.status, 200);
      assert.equal(result.draft.recipientName, `Demo ${item.name}`);
      assert.equal(result.draft.bank, item.bank);
      assert.equal(result.draft.accountNameSource, 'demo');
      assert.ok(result.draft.accountResolutionId);
    }
  }
  assert.equal((await request(env, '/auth/session', undefined, visitor.token)).user.walletBalance, 157000);
});
test('existing sessions gain missing samples once and retain saved data and balance', async () => {
  const env = environment(), visitor = await request(env, '/auth/demo', {});
  env.sql.prepare("DELETE FROM beneficiaries WHERE userId = ? AND name != 'Thomas'").run(visitor.user.id);
  await request(env, '/wallet/fund', { amount: 1000 }, visitor.token);
  const custom = await request(env, '/beneficiaries/save', { name: 'My colleague', nickname: 'colleague', bank: 'OPay', accountNumber: '0123456789' }, visitor.token);
  assert.equal(custom.status, 200);
  const results = await Promise.all([request(env, '/beneficiaries', undefined, visitor.token), request(env, '/beneficiaries', undefined, visitor.token)]);
  for (const result of results) assert.equal(result.beneficiaries.length, demoBeneficiaries.length + 1);
  assert.equal(env.sql.prepare('SELECT count(*) AS count FROM beneficiaries WHERE userId = ? AND sample = 1').get(visitor.user.id).count, demoBeneficiaries.length);
  assert.equal((await request(env, '/auth/session', undefined, visitor.token)).user.walletBalance, 158000);
  assert.equal((await request(env, '/transactions', undefined, visitor.token)).transactions.length, 1);
  const wife = (await request(env, '/payment-drafts', { text: 'Send 5k to my wife' }, visitor.token)).draft;
  const payment = await request(env, '/payments/confirm', { ...wife, pin: '1234', requestId: 'wife-sample-transfer-001' }, visitor.token);
  assert.equal(payment.status, 200); assert.equal(payment.user.walletBalance, 153000);
});
