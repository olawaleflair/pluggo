import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import process from 'node:process';

test('authenticated AI draft endpoint opens the existing confirmation path without debiting early', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'billsgo-ai-integration-'));
  const preload = join(dir, 'fake-provider.mjs');
  // Stub only the external provider transport. The actual HTTP routes, database,
  // adapter, beneficiary resolution and confirmation code all run unchanged.
  await writeFile(preload, `
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith('https://api.paystack.co/bank')) {
        const parsed = new URL(url);
        if (parsed.pathname === '/bank') return Response.json({ status: true, data: [{ name: 'Moniepoint MFB', code: '50515', active: true }] });
        return Response.json({ status: true, data: { account_number: parsed.searchParams.get('account_number'), account_name: 'SAMPLE ACCOUNT NAME' } });
      }
      if (url !== 'https://api.groq.com/openai/v1/chat/completions') return realFetch(url, options);
      const body = JSON.parse(options.body);
      const text = body.messages[1].content;
      if (text.includes('offline')) return new Response('{}', { status: 429 });
      const value = { status: 'draft', type: 'Transfer', amount: '2000', phone: null, provider: null, bank: 'Moniepoint', accountNumber: null, recipientName: null, recipientQuery: 'Thomas', message: '' };
      if (text.includes('and Jane')) Object.assign(value, { status: 'clarify', message: 'Describe one recipient at a time.' });
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });
    };
  `);
  let child;
  try {
    child = spawn(process.execPath, ['--import', pathToFileURL(preload).href, 'server/index.js'], {
      env: { ...process.env, PAYSTACK_SECRET_KEY: 'sk_test_fixture_only', GROQ_API_KEY: 'test-only-not-a-real-key', PORT: '0', BILLSGO_DB_PATH: join(dir, 'test.sqlite') }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const base = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('AI test server timeout')), 10000);
      child.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/127.0.0.1:\d+/); if (match) { clearTimeout(timeout); resolve(match[0]); } });
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error('AI test server exited ' + code)); });
    });
    async function request(path, data, token) {
      const response = await fetch(base + '/api' + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return { status: response.status, ...await response.json() };
    }
    assert.equal((await request('/payment-assistant')).status, 401);
    assert.equal((await request('/payment-drafts', { text: 'Send Thomas 5k' })).status, 401);
    const { token, user } = await request('/auth/signin', { email: 'olawale@example.com', password: 'Password123!' });
    assert.deepEqual(await request('/payment-assistant', undefined, token), { status: 200, mode: 'ai' });
    const saved = await request('/beneficiaries/save', { name: 'Thomas', nickname: 'my guy', bank: 'Moniepoint', accountNumber: '0123456789', recipientName: 'Demo Thomas' }, token);
    const before = (await request('/transactions', undefined, token)).transactions.length;
    const prepared = await request('/payment-drafts', { text: 'Abeg send Thomas 5k, actually make it 2k' }, token);
    assert.equal(prepared.draft.accountNameSource, 'paystack-test');
    assert.equal(prepared.draft.recipientName, 'SAMPLE ACCOUNT NAME');
    assert.ok(prepared.draft.accountResolutionId);
    assert.equal(JSON.stringify(prepared).includes('sk_test_fixture_only'), false);
    assert.equal(prepared.status, 200); assert.equal(prepared.draft.assistantSource, 'ai');
    assert.equal(prepared.draft.beneficiaryId, saved.beneficiary.id); assert.equal(prepared.draft.amount, '2000');
    assert.equal((await request('/auth/session', undefined, token)).user.walletBalance, user.walletBalance);
    assert.equal((await request('/transactions', undefined, token)).transactions.length, before);
    const unclear = await request('/payment-drafts', { text: 'Send Thomas 5k and Jane 2k' }, token);
    assert.equal(unclear.status, 400); assert.equal(unclear.draft, undefined);
    const fallback = await request('/payment-drafts', { text: 'Send 5k to Thomas for offline' }, token);
    assert.equal(fallback.draft.assistantSource, 'local');
    const paid = await request('/payments/confirm', { ...prepared.draft, amount: 2000, pin: '1234', requestId: 'ai-integration-confirmation-001' }, token);
    assert.match(paid.transaction.details, /Payments here remain simulated/);
    assert.doesNotMatch(paid.transaction.details, /Paystack/i);
    assert.equal(paid.status, 200); assert.equal(paid.user.walletBalance, user.walletBalance - 2000);
    assert.equal((await request('/transactions', undefined, token)).transactions.length, before + 1);
  } finally {
    if (child && child.exitCode === null) { const stopped = once(child, 'exit'); child.kill('SIGTERM'); await stopped; }
    await rm(dir, { recursive: true, force: true });
  }
});
