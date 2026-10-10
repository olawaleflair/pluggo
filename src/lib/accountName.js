export function accountNameDescription(source) {
  if (source === 'paystack-live') return 'Payments here remain simulated.';
  if (source === 'paystack-test') return 'Payments here remain simulated.';
  if (source === 'demo') return 'Simulated account name. This does not identify the real account holder.';
  if (source === 'unverified') return 'Saved name has not been looked up. It will be refreshed before a transfer.';
  return 'Choose a bank and enter the account number to look up the name.';
}

// Older receipts retain their original database text. Keep their visible copy neutral too.
export function paymentReceiptText(details) {
  return String(details || '').replace(/Account name returned by Paystack(?: \(test mode\))?/gi, 'Payments here remain simulated.');
}
