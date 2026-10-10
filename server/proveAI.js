import './env.js';
import process from 'node:process';
import assert from 'node:assert/strict';
import { createPaymentAssistant } from './paymentAssistant.js';

if (!process.env.GROQ_API_KEY?.trim()) {
  console.error('Add GROQ_API_KEY to the private .env.local file, then run npm run prove:ai again.');
  process.exit(1);
}
const assistant = createPaymentAssistant();
const saved = [{ id: 'fictional-thomas', name: 'Thomas', nickname: 'my guy', bank: 'Moniepoint', accountNumber: '0123456789', recipientName: 'Demo Thomas' }];
const cases = [
  { name: 'Nigerian phrasing', text: 'Abeg help me send Thomas five thousand through money point', expected: { type: 'Transfer', amount: '5000', beneficiaryId: 'fictional-thomas' } },
  { name: 'Explicit amount correction', text: 'Send Thomas 5k, actually make it 2k', expected: { amount: '2000', beneficiaryId: 'fictional-thomas' } },
  { name: 'Missing amount', text: 'Send Thomas money', expected: { type: 'Transfer', amount: '', beneficiaryId: 'fictional-thomas' } },
  { name: 'Airtime and leading zero', text: 'Put 500 MTN airtime on 7000000000', expected: { type: 'Airtime', amount: '500', phone: '07000000000', provider: 'MTN' } },
  { name: 'Network must stay unknown', text: 'Buy 500 airtime for 08012345678', expected: { type: 'Airtime', phone: '08012345678', provider: '' } },
  { name: 'Account leading zero', text: 'Send 2500 to 0123456789 at Moniepoint', expected: { type: 'Transfer', amount: '2500', accountNumber: '0123456789', bank: 'Moniepoint' } },
  { name: 'Multiple payments', text: 'Send Thomas 5k and buy 500 MTN airtime', reject: true },
  { name: 'Unrelated message', text: 'Tell me a joke', reject: true },
  { name: 'Cancellation', text: 'Do not send Thomas 5k', reject: true },
];
let failures = 0;
for (const [index, sample] of cases.entries()) {
  const started = Date.now();
  try {
    const { draft } = await assistant.prepare(sample.text, saved, `live-proof-${index}`);
    assert.equal(draft.assistantSource, 'ai', 'Provider did not produce an AI draft; local fallback is not AI proof.');
    assert.equal(!!sample.reject, false, 'Expected clarification or rejection, received a draft.');
    for (const [field, expected] of Object.entries(sample.expected)) assert.equal(draft[field], expected, `Incorrect ${field}`);
    console.log(`PASS ${sample.name} (${Date.now() - started} ms)`);
  } catch (error) {
    if (sample.reject && error.status === 400 && !error.message.startsWith('AI is temporarily unavailable.')) console.log(`PASS ${sample.name}: clarification/rejection (${Date.now() - started} ms)`);
    else { failures++; console.log(`FAIL ${sample.name}: ${error.message}`); }
  }
}
console.log(`${cases.length - failures}/${cases.length} live AI cases passed. No payment was confirmed and no wallet or database was changed.`);
process.exitCode = failures ? 1 : 0;
