import { randomUUID } from 'node:crypto';
import { db, atomic, insertTransaction } from './store.js';
import { banks, normalizePhone, validatePayment } from '../src/lib/paymentIntent.js';

import { createPaymentAssistant } from './paymentAssistant.js';
const assistant = createPaymentAssistant();
import { createAccountLookup } from './accountLookup.js';
const lookup = createAccountLookup();

function beneficiaries(userId) {
  return db.prepare('SELECT id, name, nickname, bank, accountNumber, recipientName, accountNameSource, accountNameResolvedAt FROM beneficiaries WHERE userId = ? ORDER BY name, bank, id').all(userId);
}
function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
function checkedResolution(id, userId, bank, accountNumber, recipientName, fail) {
  const row = db.prepare('SELECT * FROM account_resolutions WHERE id = ? AND userId = ?').get(clean(id), userId);
  const expectedSource = lookup.mode === 'demo' ? 'demo' : `paystack-${lookup.mode}`;
  if (!row || row.expiresAt <= Date.now() || row.bank !== bank || row.accountNumber !== accountNumber || row.source !== expectedSource) fail(400, 'Look up this bank account again before confirming.');
  if (recipientName !== undefined && row.recipientName !== recipientName) fail(409, 'The account name has changed. Look up the account and review it again.');
  return { recipientName: row.recipientName, accountNameSource: row.source, accountNameResolvedAt: row.resolvedAt, accountResolutionId: row.id, accountResolutionExpiresAt: row.expiresAt };
}
async function resolveAccount(bank, accountNumber, userId) {
  const result = await lookup.resolve(bank, accountNumber, userId);
  const id = randomUUID(), expiresAt = result.accountNameResolvedAt + 600000;
  db.prepare('DELETE FROM account_resolutions WHERE expiresAt <= ?').run(Date.now());
  db.prepare('INSERT INTO account_resolutions VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, userId, bank, accountNumber, result.recipientName, result.accountNameSource, result.accountNameResolvedAt, expiresAt);
  return { ...result, accountResolutionId: id, accountResolutionExpiresAt: expiresAt };
}
export async function handlePaymentRoute(req, path, user, { body, fail, publicUser }) {
  if (req.method === 'GET' && path === '/api/account-lookup') return { mode: lookup.mode };
  if (req.method === 'GET' && path === '/api/payment-assistant') return assistant.status();
  if (req.method === 'GET' && path === '/api/beneficiaries') return { beneficiaries: beneficiaries(user.id) };
  if (req.method !== 'POST') fail(405, 'Method not allowed.');
  const b = await body(req);
  if (path === '/api/accounts/resolve') return { account: await resolveAccount(clean(b.bank), clean(b.accountNumber).replace(/\s/g, ''), user.id) };
  if (path === '/api/beneficiaries/save') {
    const item = { id: clean(b.id) || randomUUID(), name: clean(b.name), nickname: clean(b.nickname), bank: clean(b.bank), accountNumber: clean(b.accountNumber), recipientName: clean(b.recipientName) };
    if (b.id && !db.prepare('SELECT id FROM beneficiaries WHERE id = ? AND userId = ?').get(item.id, user.id)) fail(404, 'Beneficiary not found.');
    if (!item.name || item.name.length > 80 || item.nickname.length > 80 || !banks.includes(item.bank) || !/^\d{10}$/.test(item.accountNumber)) fail(400, 'Enter a name, bank, 10-digit account number. Names must be at most 80 characters.');
    const resolved = b.accountResolutionId ? checkedResolution(b.accountResolutionId, user.id, item.bank, item.accountNumber, undefined, fail) : await resolveAccount(item.bank, item.accountNumber, user.id);
    Object.assign(item, { recipientName: resolved.recipientName, accountNameSource: resolved.accountNameSource, accountNameResolvedAt: resolved.accountNameResolvedAt });
    return atomic(() => {
      if (b.id) {
        if (!db.prepare('SELECT id FROM beneficiaries WHERE id = ? AND userId = ?').get(item.id, user.id)) fail(404, 'Beneficiary not found.');
        db.prepare('UPDATE beneficiaries SET name = ?, nickname = ?, bank = ?, accountNumber = ?, recipientName = ?, accountNameSource = ?, accountNameResolvedAt = ? WHERE id = ? AND userId = ?').run(item.name, item.nickname, item.bank, item.accountNumber, item.recipientName, item.accountNameSource, item.accountNameResolvedAt, item.id, user.id);
      } else db.prepare('INSERT INTO beneficiaries (id, userId, name, nickname, bank, accountNumber, recipientName, accountNameSource, accountNameResolvedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(item.id, user.id, item.name, item.nickname, item.bank, item.accountNumber, item.recipientName, item.accountNameSource, item.accountNameResolvedAt);
      return { beneficiary: item, beneficiaries: beneficiaries(user.id) };
    });
  }
  if (path === '/api/beneficiaries/delete') {
    const result = db.prepare('DELETE FROM beneficiaries WHERE id = ? AND userId = ?').run(clean(b.id), user.id);
    if (!result.changes) fail(404, 'Beneficiary not found.');
    return { beneficiaries: beneficiaries(user.id) };
  }
  if (path === '/api/payment-drafts') {
    try {
      const result = await assistant.prepare(b.text, beneficiaries(user.id), user.id);
      if (result.draft.type === 'Transfer') {
        // Names from text or legacy saved records are never treated as lookup proof.
        result.draft.recipientName = '';
        if (result.draft.bank && result.draft.accountNumber) {
          try { Object.assign(result.draft, await resolveAccount(result.draft.bank, result.draft.accountNumber, user.id)); }
          catch (error) { result.draft.accountLookupError = error.status ? error.message : 'Account lookup is unavailable. Please try again.'; }
        }
      }
      return result;
    }
    catch (error) { fail(400, error.message); }
  }
  if (path === '/api/payments/confirm') {
    if (b.pin !== '1234') fail(400, 'Incorrect demo PIN. Use 1234.');
    const requestId = clean(b.requestId);
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) fail(400, 'Missing payment confirmation ID. Reopen the review.');
    const draft = { type: b.type, amount: b.amount, phone: normalizePhone(b.phone), provider: clean(b.provider), bank: clean(b.bank), accountNumber: clean(b.accountNumber), recipientName: clean(b.recipientName), beneficiaryId: clean(b.beneficiaryId) };
    if (!['number', 'string'].includes(typeof draft.amount)) fail(400, 'Invalid amount.');
    const validation = validatePayment(draft);
    if (validation) fail(400, validation);
    draft.amount = Number(draft.amount);
    const fingerprint = JSON.stringify(draft);
    return atomic(() => {
      const previous = db.prepare('SELECT * FROM payment_requests WHERE userId = ? AND requestId = ?').get(user.id, requestId);
      if (previous) {
        if (previous.fingerprint !== fingerprint) fail(409, 'This confirmation ID was already used for different details. Reopen the review.');
        const transaction = db.prepare('SELECT * FROM transactions WHERE id = ? AND userId = ?').get(previous.transactionId, user.id);
        return { transaction: { ...transaction, amount: transaction.amount / 100 }, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)), replayed: true };
      }
      if (draft.type === 'Transfer') Object.assign(draft, checkedResolution(b.accountResolutionId, user.id, draft.bank, draft.accountNumber, draft.recipientName, fail));
      if (draft.beneficiaryId) {
        const saved = beneficiaries(user.id).find(item => item.id === draft.beneficiaryId);
        if (!saved) fail(400, 'This beneficiary is no longer available. Choose a recipient again.');
        if (saved.bank !== draft.bank || saved.accountNumber !== draft.accountNumber) fail(409, 'This beneficiary has changed. Choose it again to review the current details.');
      }
      const cents = Math.round(draft.amount * 100);
      const current = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      if (current.balance < cents) fail(400, 'Insufficient demo wallet balance. Fund your wallet first.');
      const transaction = { id: randomUUID(), userId: user.id, type: draft.type,
        provider: draft.type === 'Transfer' ? draft.bank : draft.provider, amount: cents / 100,
        phone: draft.type === 'Airtime' ? draft.phone : null,
        details: draft.type === 'Transfer' ? `To: ${draft.recipientName} | Account: ${draft.accountNumber} | ${draft.accountNameSource === 'demo' ? 'Simulated account name' : 'Payments here remain simulated.'} | Simulated transfer` : 'Simulated airtime top-up',
        date: new Date().toISOString(), status: 'success', reference: `PG-${randomUUID()}` };
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(cents, user.id);
      insertTransaction(transaction);
      db.prepare('INSERT INTO payment_requests VALUES (?, ?, ?, ?)').run(user.id, requestId, fingerprint, transaction.id);
      return { transaction, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) };
    });
  }
  fail(405, 'Method not allowed.');
}
