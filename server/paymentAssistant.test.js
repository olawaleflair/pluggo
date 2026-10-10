import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentAssistant, normalizeAIResult, paymentSchema } from './paymentAssistant.js';

const extracted = patch => ({ status: 'draft', type: 'Transfer', amount: '5000', phone: null, provider: null, bank: 'Moniepoint', accountNumber: null, recipientName: null, recipientQuery: 'Thomas', message: '', ...patch });
const people = [{ id: 'saved-thomas', name: 'Thomas', nickname: 'my brother', bank: 'Moniepoint', accountNumber: '0234567891', recipientName: 'Demo Thomas' }];
function provider(value) { return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }) }; }

test('AI phrasing maps to the existing review draft and resolves beneficiaries locally', async () => {
  let payload;
  const assistant = createPaymentAssistant({ key: 'test-only', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    payload = JSON.parse(options.body);
    return provider(extracted());
  } });
  const { draft } = await assistant.prepare('Abeg send Thomas five thousand through money point', people, 'user-1');
  assert.equal(draft.amount, '5000'); assert.equal(draft.beneficiaryId, 'saved-thomas');
  assert.equal(draft.accountNumber, '0234567891'); assert.equal(draft.assistantSource, 'ai');
  assert.equal(payload.response_format.json_schema.strict, true);
  assert.deepEqual(payload.response_format.json_schema.schema, paymentSchema);
  assert.equal(payload.model, 'openai/gpt-oss-120b');
  assert.equal(payload.messages.length, 2);
  assert.equal(JSON.stringify(payload).includes('0234567891'), false, 'saved account must not be sent to provider');
});
test('explicit corrections, missing details and duplicate names preserve review choices', async () => {
  const assistant = createPaymentAssistant({ key: 'test', fetchImpl: async () => provider(extracted({ amount: '2000' })) });
  const result = await assistant.prepare('Send Thomas 5k, actually make it 2k', [...people, { ...people[0], id: 'other' }], 'u');
  assert.equal(result.draft.amount, '2000'); assert.equal(result.draft.candidates.length, 2);
  assert.equal(result.draft.beneficiaryId, undefined);
  const missing = createPaymentAssistant({ key: 'test', fetchImpl: async () => provider(extracted({ amount: null, bank: null })) });
  assert.equal((await missing.prepare('Send Thomas money', people, 'u')).draft.amount, '');
});
test('clarification and unsupported responses do not silently fall back to a payment', async () => {
  for (const status of ['clarify', 'unsupported']) {
    const assistant = createPaymentAssistant({ key: 'test', fetchImpl: async () => provider(extracted({ status, message: 'Describe one payment at a time.' })) });
    await assert.rejects(assistant.prepare('Transfer 5k to Thomas', people, 'u'), error => error.status === 400 && /one payment/.test(error.message));
  }
});
test('provided account and phone numbers must come from the input', () => {
  const account = normalizeAIResult(extracted({ accountNumber: '0123456789', recipientQuery: null }), 'Send 5k to 0123456789 Moniepoint');
  assert.equal(account.accountNumber, '0123456789');
  assert.throws(() => normalizeAIResult(extracted({ accountNumber: '0987654321' }), 'Send 5k to Thomas'), /account number/);
  const airtime = extracted({ type: 'Airtime', amount: '500', bank: null, recipientQuery: null, phone: '7000000000', provider: null });
  const draft = normalizeAIResult(airtime, 'Put 500 airtime on 7000000000');
  assert.equal(draft.phone, '07000000000'); assert.equal(draft.provider, ''); assert.match(draft.phoneNotice, /leading 0/);
  assert.equal(normalizeAIResult({ ...airtime, phone: '+234 700 000 0000' }, 'Put 500 airtime on +234 700 000 0000').phone, '07000000000');
  assert.throws(() => normalizeAIResult({ ...airtime, phone: '08012345678' }, 'Put 500 airtime on my phone'), /mobile number/);
});
test('AI fields cannot bypass service, amount or bank checks', async () => {
  for (const patch of [{ amount: '-50' }, { amount: '1000001' }, { amount: '5.001' }, { amount: 'oops' }, { bank: 'Unknown Bank' }, { provider: 'MTN' }]) {
    const assistant = createPaymentAssistant({ key: 'test', fetchImpl: async () => provider(extracted(patch)) });
    await assert.rejects(assistant.prepare('Transfer 5k to Thomas', people, 'u'), error => error.status === 400);
  }
});
test('no key and provider failure use a visibly labelled local parser', async () => {
  const noKey = createPaymentAssistant({ key: '', fetchImpl: () => { throw new Error('Must not call provider'); } });
  assert.deepEqual(noKey.status(), { mode: 'local' });
  assert.equal((await noKey.prepare('Send 5k to Thomas', people, 'u')).draft.assistantSource, 'local');
  for (const fetchImpl of [async () => ({ ok: false, status: 429 }), async () => { throw new DOMException('Timeout', 'TimeoutError'); }, async () => provider({ amount: 5000 }), async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }) })]) {
    const assistant = createPaymentAssistant({ key: 'test', fetchImpl });
    const result = await assistant.prepare('Send 5k to Thomas', people, 'u');
    assert.equal(result.draft.assistantSource, 'local'); assert.match(result.draft.assistantNotice, /temporarily unavailable/);
    await assert.rejects(assistant.prepare('Abeg help my guy out', people, 'u'), /manual|payment forms/);
  }
});
test('demo quotas and concurrent calls fall back without issuing extra provider calls', async () => {
  let count = 0, time = Date.UTC(2026, 9, 5);
  const assistant = createPaymentAssistant({ key: 'test', now: () => time, fetchImpl: async () => { count++; return provider(extracted()); } });
  for (let i = 0; i < 5; i++) assert.equal((await assistant.prepare('Send 5k to Thomas', people, 'u')).draft.assistantSource, 'ai');
  assert.equal((await assistant.prepare('Send 5k to Thomas', people, 'u')).draft.assistantSource, 'local'); assert.equal(count, 5);
  time += 60000;
  assert.equal((await assistant.prepare('Send 5k to Thomas', people, 'u')).draft.assistantSource, 'ai');
  for (let i = 0; i < 94; i++) await assistant.prepare('Send 5k to Thomas', people, `u-${i}`);
  assert.equal(count, 100);
  assert.equal((await assistant.prepare('Send 5k to Thomas', people, 'new')).draft.assistantSource, 'local');
  time += 86400000;
  assert.equal((await assistant.prepare('Send 5k to Thomas', people, 'u')).draft.assistantSource, 'ai');
  let finish;
  const pending = createPaymentAssistant({ key: 'test', fetchImpl: () => new Promise(resolve => { finish = resolve; }) });
  const first = pending.prepare('Send 5k to Thomas', people, 'u');
  assert.equal((await pending.prepare('Send 5k to Thomas', people, 'u')).draft.assistantSource, 'local');
  finish(provider(extracted())); await first;
});

test('obvious combined actions and cancellation are rejected before any provider call', async () => {
  const assistant = createPaymentAssistant({ key: 'test', fetchImpl: () => { throw new Error('Must not call provider'); } });
  for (const text of ['Send Thomas 5k and buy 500 MTN airtime', 'Transfer 5k to Thomas then send 2k to Jane', 'Do not send Thomas 5k', "Don't transfer 5k to Thomas"]) await assert.rejects(assistant.prepare(text, people, 'u'), error => error.status === 400 && !error.message.includes('unavailable'));
});

test('bare number ambiguity is resolved before AI and an AI guess cannot pick airtime', async () => {
  const assistant = createPaymentAssistant({ key: 'test', fetchImpl: () => { throw new Error('No provider call expected'); } });
  const { draft } = await assistant.prepare('send 10k to 7000000000', [], 'u');
  assert.equal(draft.type, 'Choice'); assert.equal(draft.recipientNumber, '7000000000');
  assert.equal(draft.amount, '10000'); assert.equal(draft.phone, '');
  const guessed = normalizeAIResult(extracted({ type: 'Airtime', amount: '2000', phone: '7000000000', provider: 'MTN', bank: null, recipientQuery: null }), 'Send 5k, actually 2k to 7000000000');
  assert.equal(guessed.type, 'Choice'); assert.equal(guessed.amount, '2000');
  assert.equal(guessed.recipientNumber, '7000000000'); assert.equal(guessed.provider, '');
});
