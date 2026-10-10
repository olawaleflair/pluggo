import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountNameDescription, paymentReceiptText } from '../src/lib/accountName.js';

test('account name messages and historic receipt copy hide the lookup provider', () => {
  for (const source of ['paystack-live', 'paystack-test']) {
    assert.equal(accountNameDescription(source), 'Payments here remain simulated.');
  }
  for (const mode of ['', ' (test mode)']) {
    const receipt = paymentReceiptText(`To: Demo Person | Account: 0000000000 | Account name returned by Paystack${mode} | Simulated transfer`);
    assert.doesNotMatch(receipt, /paystack/i);
    assert.match(receipt, /Account: 0000000000/);
    assert.match(receipt, /Payments here remain simulated/);
  }
});
