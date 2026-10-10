import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePaymentIntent, resolveBeneficiary, validatePayment, needsPaymentSetup } from '../src/lib/paymentIntent.js';

test('local payment requests extract amounts and preserve recipient numbers', () => {
  for (const text of ['Transfer 5,000 naira to Thomas', 'Send Thomas 5k', 'Transfer five thousand naira to Thomas']) {
    const draft = parsePaymentIntent(text);
    assert.equal(draft.type, 'Transfer'); assert.equal(draft.amount, '5000'); assert.equal(draft.recipientQuery.toLowerCase(), 'thomas');
  }
  const account = parsePaymentIntent('Transfer 5,000 to 0123456789, money point');
  assert.equal(account.bank, 'Moniepoint'); assert.equal(account.accountNumber, '0123456789'); assert.equal(account.amount, '5000');
  const phone = parsePaymentIntent('Buy one thousand naira MTN airtime for +234 801 234 5678');
  assert.equal(phone.phone, '08012345678'); assert.equal(phone.amount, '1000'); assert.equal(phone.provider, 'MTN');
  assert.equal(parsePaymentIntent('1000 naira to 08012345678').provider, '');
  assert.equal(parsePaymentIntent('Transfer 5.25 to my wife').amount, '5.25');
  assert.equal(parsePaymentIntent('Transfer 5000').recipientQuery, '');
});
test('unsupported or ambiguous instructions do not silently become a payment', () => {
  for (const text of ['', 'I want to buy beer', 'Transfer -500 to Thomas', 'Transfer 5,00 to Thomas', 'Transfer 5.001 to Thomas', 'Transfer 5000 or 6000 to Thomas', 'Transfer 5000 to Thomas and Jane', 'Transfer 5000 to 0123456789 and 0987654321', 'Buy 100 MTN Glo airtime for 08012345678', 'Transfer 100 MTN airtime to 08012345678', 'Transfer 5 dollars to Thomas', 'Do not transfer 5000 to Thomas', 'Buy 100 data for 08012345678', 'Transfer 100 to 08012345678', 'Transfer 100 to Thomas OPay Moniepoint']) assert.throws(() => parsePaymentIntent(text), undefined, text);
});
test('airtime accepts a missing leading zero without changing transfer account numbers', () => {
  for (const number of ['7000000000', '700 000 0000', '700-000-0000', '07000000000', '+2347000000000']) {
    const draft = parsePaymentIntent(`1k airtime to ${number}`);
    assert.equal(draft.phone, '07000000000');
    assert.equal(draft.amount, '1000');
    assert.equal(draft.provider, '');
    assert.equal(validatePayment(draft), 'Choose the airtime network.');
  }
  assert.match(parsePaymentIntent('1k airtime to 7000000000').phoneNotice, /Added the leading 0/);
  assert.equal(parsePaymentIntent('1k MTN airtime to 7000000000').provider, 'MTN');
  assert.equal(parsePaymentIntent('Transfer 1k to 7000000000 OPay').accountNumber, '7000000000');
  assert.equal(parsePaymentIntent('Transfer 1k to 7000000000 OPay').phone, '');
  assert.throws(() => parsePaymentIntent('1k airtime to 700000000'), /Check the phone number/);
  assert.throws(() => parsePaymentIntent('1k airtime to 70000000000'), /Check the phone number/);
  assert.throws(() => parsePaymentIntent('1k airtime to 7000000000 and 8000000000'), /just one phone/);
});
test('beneficiary resolution requires a unique exact name or nickname', () => {
  const people = [ { id: '1', name: 'Thomas', nickname: 'my wife', bank: 'OPay', accountNumber: '0123456789', recipientName: 'Demo Thomas' } ];
  assert.equal(resolveBeneficiary(parsePaymentIntent('Transfer 5k to MY WIFE'), people).beneficiaryId, '1');
  assert.equal(resolveBeneficiary(parsePaymentIntent('Transfer 5k to Thom'), people).beneficiaryId, undefined);
  people.push({ ...people[0], id: '2', bank: 'Moniepoint' });
  assert.equal(resolveBeneficiary(parsePaymentIntent('Transfer 5k to Thomas'), people).candidates.length, 2);
  assert.equal(resolveBeneficiary(parsePaymentIntent('Transfer 5k to Thomas OPay'), people).beneficiaryId, '1');
});
test('payment validation rejects missing details and invalid precision', () => {
  assert.equal(validatePayment({ type: 'Transfer', bank: 'OPay', accountNumber: '0123456789', recipientName: 'Demo', amount: 5.25 }), '');
  for (const amount of [0, -1, 1.001, 1000001, 'oops']) assert.notEqual(validatePayment({ type: 'Transfer', bank: 'OPay', accountNumber: '0123456789', recipientName: 'Demo', amount }), '');
  assert.notEqual(validatePayment({ type: 'Transfer', bank: 'OPay', accountNumber: '0123456789', amount: 5 }), '');
  assert.notEqual(validatePayment({ type: 'Airtime', phone: '08012345678', provider: '', amount: 100 }), '');
});

test('bare recipient numbers ask for a payment type without adding or removing digits', () => {
  for (const number of ['7000000000', '7000 0000 00', '0123456789', '07000000000', '+2347000000000']) {
    const draft = parsePaymentIntent(`Send 10k to ${number}`);
    assert.equal(draft.type, 'Choice'); assert.equal(draft.amount, '10000');
    assert.equal(draft.recipientNumber, number.replace(/ /g, ''));
    assert.equal(draft.phone, ''); assert.equal(draft.accountNumber, '');
    assert.equal(draft.phoneNotice, undefined); assert.equal(needsPaymentSetup(draft), true);
    assert.notEqual(validatePayment(draft), '');
  }
  assert.equal(parsePaymentIntent('Send 5k to OPay 7000 0000 00').type, 'Transfer');
  assert.equal(parsePaymentIntent('Send 5k to OPay 7000 0000 00').accountNumber, '7000000000');
  const transfer = parsePaymentIntent('Transfer 10k to 7000000000');
  assert.equal(transfer.type, 'Transfer'); assert.equal(needsPaymentSetup(transfer), true);
  assert.equal(needsPaymentSetup(parsePaymentIntent('Send 5k to Thomas')), false);
  assert.equal(needsPaymentSetup(parsePaymentIntent('Buy 1k airtime for 7000000000')), true);
  assert.equal(needsPaymentSetup(parsePaymentIntent('Buy 1k MTN airtime for 7000000000')), false);
  assert.throws(() => parsePaymentIntent('Send 5k to 7000000000 and 8000000000'), /one recipient/);
});
