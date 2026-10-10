import process from 'node:process';
import { banks } from '../src/lib/paymentIntent.js';
const aliases = {
  Moniepoint: /moniepoint/i, OPay: /opay/i, 'Access Bank': /^access bank$/i,
  'First Bank': /^first bank of nigeria$/i, GTBank: /guaranty trust bank/i,
  UBA: /united bank for africa/i, 'Zenith Bank': /^zenith bank$/i, Kuda: /kuda/i,
};
const problem = (status, message) => Object.assign(new Error(message), { status });
export function createAccountLookup({ key = process.env.PAYSTACK_SECRET_KEY || '', fetchImpl = fetch, now = Date.now, timeoutMs = 10000 } = {}) {
  const mode = !key.trim() ? 'demo' : key.startsWith('sk_test_') ? 'test' : key.startsWith('sk_live_') ? 'live' : 'invalid';
  let bankList, bankListExpires = 0, bankPromise;
  let windowStart = now(), total = 0, day = '', daily = 0;
  const perUser = new Map(), cache = new Map(), pending = new Map();
  async function request(url) {
    let response, body;
    try {
      response = await fetchImpl(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(timeoutMs) });
      body = await response.json();
    } catch { throw problem(503, 'Account lookup is unavailable. Please try again.'); }
    if (response.status === 401 || response.status === 403) throw problem(503, 'Account lookup is not available for this configuration.');
    if (response.status === 429) {
      // Test keys have a separate daily allowance for resolving real bank accounts.
      // This is not a minute-based throttle; do not suggest an immediate retry.
      if (mode === 'test' && /test mode daily limit.*live bank resolves/i.test(body.message || '')) {
        throw problem(503, 'Test account lookup has reached its daily limit. Please try again after the daily allowance resets.');
      }
      throw problem(429, 'Account lookup is busy. Please wait a minute and try again.');
    }
    if (!response.ok || body.status !== true) throw problem(response.status >= 500 ? 503 : 400, response.status >= 500 ? 'Account lookup is unavailable. Please try again.' : 'Could not find this account. Check the bank and account number.');
    return body;
  }
  async function codes() {
    if (bankList && bankListExpires > now()) return bankList;
    if (!bankPromise) bankPromise = (async () => {
      const result = [], seen = new Set();
      let next = '';
      for (let page = 0; page < 10; page++) {
        const url = new URL('https://api.paystack.co/bank');
        url.searchParams.set('country', 'nigeria'); url.searchParams.set('perPage', '100'); url.searchParams.set('use_cursor', 'true');
        if (next) url.searchParams.set('next', next);
        const body = await request(url.href);
        if (!Array.isArray(body.data)) throw problem(503, 'The bank list is incomplete. Please retry.');
        result.push(...body.data);
        next = body.meta?.next;
        if (!next) { bankList = result; bankListExpires = now() + 86400000; return result; }
        if (seen.has(next)) break;
        seen.add(next);
      }
      throw problem(503, 'Could not load the complete bank list. Please retry.');
    })().finally(() => { bankPromise = null; });
    return bankPromise;
  }
  function reserve(userId) {
    const time = now(), today = new Date(time).toISOString().slice(0, 10);
    if (day !== today) { day = today; daily = 0; perUser.clear(); }
    if (time - windowStart >= 60000) { windowStart = time; total = 0; }
    const user = perUser.get(userId) || { start: time, count: 0 };
    if (time - user.start >= 60000) { user.start = time; user.count = 0; }
    if (user.count >= 10 || total >= 60 || daily >= 500) throw problem(429, 'Account lookup limit reached. Please wait and try again.');
    user.count++; total++; daily++; perUser.set(userId, user);
  }
  return {
    mode,
    async resolve(bank, accountNumber, userId) {
      if (!banks.includes(bank) || !/^\d{10}$/.test(accountNumber || '')) throw problem(400, 'Choose a bank and enter a 10-digit account number.');
      if (mode === 'invalid') throw problem(503, 'Account lookup is not configured correctly.');
      if (mode === 'demo') return { bank, accountNumber, recipientName: `Demo Recipient ${accountNumber.slice(-4)}`, accountNameSource: 'demo', accountNameResolvedAt: now() };
      const cacheKey = JSON.stringify([userId, bank, accountNumber]);
      const previous = cache.get(cacheKey);
      if (previous && previous.expires > now()) return previous.value;
      if (pending.has(cacheKey)) return pending.get(cacheKey);
      reserve(userId);
      const operation = (async () => {
        const list = await codes();
        const matches = list.filter(item => item.active !== false && !item.is_deleted && aliases[bank].test(item.name || ''));
        if (matches.length !== 1 || !matches[0].code) throw problem(400, 'This bank is not currently available for account lookup. Choose another bank.');
        const url = new URL('https://api.paystack.co/bank/resolve');
        url.searchParams.set('account_number', accountNumber); url.searchParams.set('bank_code', matches[0].code);
        const body = await request(url.href);
        const name = body.data?.account_name;
        if (body.data?.account_number !== accountNumber || typeof name !== 'string' || !name.trim() || name.length > 80) throw problem(503, 'Could not retrieve a matching account name. Please retry.');
        const value = { bank, accountNumber, recipientName: name.trim(), accountNameSource: `paystack-${mode}`, accountNameResolvedAt: now() };
        if (cache.size >= 500) cache.delete(cache.keys().next().value);
        cache.set(cacheKey, { value, expires: now() + 600000 });
        return value;
      })().finally(() => pending.delete(cacheKey));
      pending.set(cacheKey, operation);
      return operation;
    },
  };
}
