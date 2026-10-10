import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';

test('SQLite auth, isolated wallets, atomic debits and restart persistence', async () => {
 const dir = await mkdtemp(join(tmpdir(), 'billsgo-test-'));
 let child, base;
 async function start() {
  child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PAYSTACK_SECRET_KEY: '', PORT: '0', GROQ_API_KEY: '', BILLSGO_DB_PATH: join(dir, 'test.sqlite') }, stdio: ['ignore','pipe','pipe'] });
  let output = '';
  await new Promise((resolve, reject) => {
   const timer = setTimeout(() => reject(new Error('Server start timeout')), 10000);
   child.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/127.0.0.1:(\d+)/); if (match) { base = match[0]; clearTimeout(timer); resolve(); } });
   child.once('error', reject);
   child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
  });
 }
 async function stop() { const done = once(child, 'exit'); child.kill('SIGTERM'); await done; }
 async function request(path, data, token) {
  const r = await fetch(base + '/api' + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  return { status: r.status, ...await r.json() };
 }
 try {
  await start();
  assert.equal((await request('/transactions')).status, 401);
  assert.equal((await request('/auth/signin', { email:'olawale@example.com', password:'wrong' })).status, 401);
  const demo = await request('/auth/signin', { email:'olawale@example.com', password:'Password123!' });
  assert.equal(demo.user.walletBalance, 45750);
  assert.equal((await request('/transactions', undefined, demo.token)).transactions.length, 10);
  const credentials = { name:'Test', email:'test@example.com', phone:'08012345678', password:'TestPassword123!' };
  const account = await request('/auth/signup', credentials), token = account.token;
  assert.equal(account.user.walletBalance, 0);
  assert.equal((await request('/auth/signup', credentials)).status, 409);
  assert.equal((await request('/transactions', undefined, token)).transactions.length, 0);
  for (const amount of [-1, 0, 1.001, 'oops', true, 1000001]) assert.equal((await request('/wallet/fund', { amount }, token)).status, 400);
  assert.equal((await request('/accounts/resolve', { bank: 'OPay', accountNumber: '0123456789' })).status, 401);
  const funded = await request('/wallet/fund', { amount:100.25 }, token);
  assert.equal(funded.user.walletBalance, 100.25);
  const payment = { type:'Airtime', provider:'MTN', amount:60, phone:'08012345678' };
  const paid = await Promise.all([request('/payments', payment, token), request('/payments', payment, token)]);
  assert.deepEqual(paid.map(r => r.status).sort(), [200,400]);
  assert.equal((await request('/auth/session', undefined, token)).user.walletBalance, 40.25);
  assert.equal((await request('/transactions', undefined, token)).transactions.length, 2);
  assert.equal((await request('/auth/session', undefined, demo.token)).user.walletBalance, 45750);
  await stop();
  // Reproduce a pre-feature database: only the old account/wallet/history tables remain.
  const legacy = new DatabaseSync(join(dir, 'test.sqlite'));
  legacy.exec('DROP TABLE payment_requests; DROP TABLE beneficiaries;'); legacy.close();
  await start();
  assert.equal((await request('/auth/session', undefined, token)).user.walletBalance, 40.25);
  assert.equal((await request('/transactions', undefined, token)).transactions.length, 2);
  // New tables are added without replacing the existing users, wallet or history.
  const beneficiary = { name: 'Thomas', nickname: 'my wife', bank: 'OPay', accountNumber: '0123456789', recipientName: 'Demo Thomas' };
  const saved = await request('/beneficiaries/save', beneficiary, token);
  assert.equal(saved.status, 200);
  assert.equal((await request('/beneficiaries', undefined, demo.token)).beneficiaries.length, 0);
  assert.equal((await request('/beneficiaries/save', { ...beneficiary, id: saved.beneficiary.id }, demo.token)).status, 404);
  assert.equal((await request('/beneficiaries/delete', { id: saved.beneficiary.id }, demo.token)).status, 404);
  const draft = (await request('/payment-drafts', { text: 'Transfer five naira to my wife' }, token)).draft;
  assert.equal(draft.beneficiaryId, saved.beneficiary.id);
  assert.equal(draft.accountNumber, '0123456789');
  assert.equal(draft.amount, '5');
  assert.equal((await request('/auth/session', undefined, token)).user.walletBalance, 40.25);
  assert.equal(draft.accountNameSource, 'demo');
  assert.equal(draft.recipientName, 'Demo Recipient 6789');
  assert.equal((await request('/payments/confirm', { ...draft, accountResolutionId: '', requestId: 'no-proof-confirmation-01', pin: '1234' }, token)).status, 400);
  assert.equal((await request('/payments/confirm', { ...draft, recipientName: 'Forged Name', requestId: 'forged-name-confirmation-01', pin: '1234' }, token)).status, 409);
  assert.equal((await request('/payments/confirm', { ...draft, bank: 'UBA', requestId: 'wrong-bank-confirmation-01', pin: '1234' }, token)).status, 400);
  const confirmation = { ...draft, requestId: 'test-confirmation-0001', pin: '1234' };
  assert.equal((await request('/payments/confirm', { ...confirmation, pin: '9999' }, token)).status, 400);
  assert.equal((await request('/payments/confirm', { ...confirmation, amount: 1000 }, token)).status, 400);
  assert.equal((await request('/payments/confirm', confirmation, demo.token)).status, 400);
  const duplicates = await Promise.all([request('/payments/confirm', confirmation, token), request('/payments/confirm', confirmation, token)]);
  assert.deepEqual(duplicates.map(r => r.status), [200, 200]);
  assert.equal(duplicates[0].transaction.id, duplicates[1].transaction.id);
  assert.equal((await request('/auth/session', undefined, token)).user.walletBalance, 35.25);
  assert.equal((await request('/transactions', undefined, token)).transactions.length, 3);
  assert.equal((await request('/payments/confirm', { ...confirmation, amount: 6 }, token)).status, 409);
  const second = await request('/beneficiaries/save', { ...beneficiary, bank: 'Moniepoint', accountNumber: '0987654321' }, token);
  assert.equal((await request('/payment-drafts', { text: 'Transfer 5 to Thomas' }, token)).draft.candidates.length, 2);
  assert.equal((await request('/payment-drafts', { text: 'Transfer 5 to nobody' }, token)).draft.candidates.length, 0);
  await request('/beneficiaries/save', { ...beneficiary, id: saved.beneficiary.id, bank: 'Access Bank' }, token);
  assert.equal((await request('/payments/confirm', { ...confirmation, requestId: 'test-confirmation-0002' }, token)).status, 409);
  assert.match((await request('/transactions', undefined, token)).transactions[0].details, /Demo Recipient 6789/);
  assert.equal((await request('/payments/confirm', confirmation, token)).transaction.id, duplicates[0].transaction.id);
  await request('/beneficiaries/delete', { id: saved.beneficiary.id }, token);
  assert.equal((await request('/payments/confirm', { ...confirmation, requestId: 'test-confirmation-0003' }, token)).status, 400);
  assert.equal((await request('/payments/confirm', confirmation, token)).status, 200);
  await request('/wallet/fund', { amount: 200 }, token);
  const airtime = (await request('/payment-drafts', { text: 'Buy 100 MTN airtime for +2348012345678' }, token)).draft;
  assert.equal(airtime.phone, '08012345678');
  assert.equal((await request('/payments/confirm', { ...airtime, pin: '1234', requestId: 'test-confirmation-0004' }, token)).status, 200);
  assert.equal((await request('/payments/confirm', { ...airtime, phone: 'oops', pin: '1234', requestId: 'test-confirmation-0005' }, token)).status, 400);
  assert.equal((await request('/payment-drafts', { text: 'Buy 100 data for 08012345678' }, token)).status, 400);
  await stop(); await start();
  assert.equal((await request('/beneficiaries', undefined, token)).beneficiaries[0].id, second.beneficiary.id);
  assert.equal((await request('/auth/session', undefined, token)).user.walletBalance, 135.25);
  assert.equal((await request('/transactions', undefined, token)).transactions.length, 5);
  const proofDb = new DatabaseSync(join(dir, 'test.sqlite'));
  proofDb.prepare('UPDATE account_resolutions SET expiresAt = 0 WHERE id = ?').run(draft.accountResolutionId); proofDb.close();
  assert.equal((await request('/payments/confirm', confirmation, token)).status, 200);
  assert.equal((await request('/payments/confirm', { ...confirmation, beneficiaryId: '', requestId: 'expired-proof-confirmation-01' }, token)).status, 400);
  const resolved = (await request('/accounts/resolve', { bank: 'OPay', accountNumber: '0123456789' }, token)).account;
  const withdrawals = await Promise.all(['a', 'b'].map(suffix => request('/payments/confirm', { ...resolved, type: 'Transfer', amount: 100, pin: '1234', requestId: `concurrent-transfer-${suffix}` }, token)));
  assert.deepEqual(withdrawals.map(r => r.status).sort(), [200, 400]);
  assert.equal((await request('/auth/session', undefined, token)).user.walletBalance, 35.25);
  assert.equal((await request('/transactions', undefined, token)).transactions.length, 6);
  await request('/auth/signout', {}, token);
  assert.equal((await request('/auth/session', undefined, token)).status, 401);
 } finally { if (child && child.exitCode === null) await stop(); await rm(dir, { recursive:true, force:true }); }
});
