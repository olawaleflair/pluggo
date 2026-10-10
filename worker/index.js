import { demoBeneficiaries } from './demoBeneficiaries.js';
import { createPaymentAssistant } from '../server/paymentAssistant.js';
import { createAccountLookup } from '../server/accountLookup.js';
import { banks, normalizePhone, validatePayment } from '../src/lib/paymentIntent.js';

const DAY = 86400000;
const clean = value => typeof value === 'string' ? value.trim() : '';
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const stmt = (env, sql, ...values) => env.DB.prepare(sql).bind(...values);
const first = (env, sql, ...values) => stmt(env, sql, ...values).first();
const all = async (env, sql, ...values) => (await stmt(env, sql, ...values).all()).results;
const publicUser = user => ({ id: user.id, name: user.name, email: 'Private demo session', phone: '', walletBalance: user.balance / 100, demo: true });
const publicTransaction = row => ({ ...row, amount: row.amount / 100 });
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function reserveQuota(env, entries) {
  const now = Date.now();
  try {
    await env.DB.batch(entries.map(([name, limit, window]) => {
      const bucket = Math.floor(now / window), expires = (bucket + 1) * window;
      return stmt(env, 'INSERT INTO quotas VALUES (?, 1, ?, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1', `${name}:${bucket}`, limit, expires);
    }));
  } catch (error) {
    if (/CHECK constraint failed/.test(error.message)) fail(429, 'Demo usage limit reached. Please try again later.');
    throw error;
  }
}
function sampleInsert(env, userId, item) {
  return stmt(env, `INSERT INTO beneficiaries SELECT ?, ?, ?, ?, ?, ?, ?, 'demo', 0, 1
    WHERE NOT EXISTS (SELECT 1 FROM beneficiaries WHERE userId = ? AND bank = ? AND accountNumber = ? AND sample = 1)`,
    crypto.randomUUID(), userId, item.name, item.nickname, item.bank, item.accountNumber, `Demo ${item.name}`, userId, item.bank, item.accountNumber);
}
async function ensureSamples(env, userId) {
  const existing = await all(env, 'SELECT bank, accountNumber FROM beneficiaries WHERE userId = ? AND sample = 1', userId);
  const missing = demoBeneficiaries.filter(item => !existing.some(row => row.bank === item.bank && row.accountNumber === item.accountNumber));
  if (missing.length) await env.DB.batch(missing.map(item => sampleInsert(env, userId, item)));
}
async function saved(env, id) {
  await ensureSamples(env, id);
  return all(env, 'SELECT id, name, nickname, bank, accountNumber, recipientName, accountNameSource, accountNameResolvedAt, sample FROM beneficiaries WHERE userId = ? ORDER BY name', id);
}
async function authenticate(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (!token || token.length > 200) fail(401, 'Start a new demo session.');
  const user = await first(env, 'SELECT visitors.* FROM visitors JOIN sessions ON sessions.userId = visitors.id WHERE sessions.token = ? AND sessions.expires > ? AND visitors.expires > ?', await hash(token), Date.now(), Date.now());
  if (!user) fail(401, 'Your demo session expired. Start a new demo session.');
  return user;
}
async function readBody(request) {
  if (Number(request.headers.get('Content-Length')) > 10000) fail(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) return {};
  let size = 0; const parts = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 10000) { await reader.cancel(); fail(413, 'Request too large.'); }
    parts.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes) || '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') fail(400, 'Invalid request.');
    return value;
  } catch { fail(400, 'Invalid JSON request.'); }
}
async function createVisitor(request, env) {
  const ip = await hash(request.headers.get('CF-Connecting-IP') || 'local');
  await reserveQuota(env, [[`sessions:ip:${ip}`, 5, 60000], ['sessions:global', 1000, DAY]]);
  const id = crypto.randomUUID(), token = crypto.randomUUID() + crypto.randomUUID(), expires = Date.now() + DAY;
  await env.DB.batch([
    stmt(env, 'INSERT INTO visitors VALUES (?, ?, 15700000, ?)', id, 'Demo visitor', expires),
    stmt(env, 'INSERT INTO sessions VALUES (?, ?, ?)', await hash(token), id, expires),
    ...demoBeneficiaries.map(item => sampleInsert(env, id, item)),
  ]);
  return { token, user: publicUser({ id, name: 'Demo visitor', balance: 15700000 }), expires };
}
function lookupFields(row) {
  return { bank: row.bank, accountNumber: row.accountNumber, recipientName: row.recipientName, accountNameSource: row.source, accountNameResolvedAt: row.resolvedAt, accountResolutionId: row.id, accountResolutionExpiresAt: row.expiresAt };
}
const lookupMode = env => !env.PAYSTACK_SECRET_KEY ? 'demo' : env.PAYSTACK_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test';
async function providerFetch(env, userId, url, options) {
  const path = new URL(url).pathname;
  if (new URL(url).hostname === 'api.groq.com') await reserveQuota(env, [[`ai:user:${userId}`, 5, 60000], ['ai:global', 100, DAY]]);
  if (path === '/bank/resolve') await reserveQuota(env, [[`lookup:user:${userId}`, 10, 60000], ['lookup:global', 500, DAY]]);
  if (path === '/bank') {
    const key = `banks:${url}`, previous = await first(env, 'SELECT value FROM provider_cache WHERE key = ? AND expires > ?', key, Date.now());
    if (previous) return new Response(previous.value, { headers: { 'Content-Type': 'application/json' } });
    const response = await fetch(url, options);
    if (response.ok) {
      const value = await response.clone().text();
      await stmt(env, 'INSERT INTO provider_cache VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires = excluded.expires', key, value, Date.now() + DAY).run();
    }
    return response;
  }
  return fetch(url, options);
}
async function resolveAccount(env, userId, bank, accountNumber) {
  if (!banks.includes(bank) || !/^\d{10}$/.test(accountNumber)) fail(400, 'Choose a bank and enter a 10-digit account number.');
  const sample = await first(env, 'SELECT recipientName FROM beneficiaries WHERE userId = ? AND bank = ? AND accountNumber = ? AND sample = 1', userId, bank, accountNumber);
  const source = sample || !env.PAYSTACK_SECRET_KEY ? 'demo' : `paystack-${lookupMode(env)}`;
  const existing = await first(env, 'SELECT * FROM account_resolutions WHERE userId = ? AND bank = ? AND accountNumber = ? AND source = ? AND expiresAt > ? ORDER BY resolvedAt DESC LIMIT 1', userId, bank, accountNumber, source, Date.now());
  if (existing) return lookupFields(existing);
  const adapter = createAccountLookup({ key: env.PAYSTACK_SECRET_KEY || '', fetchImpl: (url, options) => providerFetch(env, userId, url, options) });
  const value = sample ? { recipientName: sample.recipientName, accountNameSource: 'demo', accountNameResolvedAt: Date.now() } : await adapter.resolve(bank, accountNumber, userId);
  const row = { id: crypto.randomUUID(), userId, bank, accountNumber, recipientName: value.recipientName, source: value.accountNameSource, resolvedAt: value.accountNameResolvedAt, expiresAt: value.accountNameResolvedAt + 600000 };
  await stmt(env, 'INSERT INTO account_resolutions VALUES (?, ?, ?, ?, ?, ?, ?, ?)', row.id, userId, bank, accountNumber, row.recipientName, row.source, row.resolvedAt, row.expiresAt).run();
  return lookupFields(row);
}
async function checkedResolution(env, userId, body) {
  const row = await first(env, 'SELECT * FROM account_resolutions WHERE id = ? AND userId = ? AND bank = ? AND accountNumber = ? AND expiresAt > ?', clean(body.accountResolutionId), userId, clean(body.bank), clean(body.accountNumber), Date.now());
  if (!row) fail(400, 'Look up this bank account again before confirming.');
  if (body.recipientName !== undefined && row.recipientName !== body.recipientName) fail(409, 'The account name changed. Look up the account again.');
  const sample = await first(env, 'SELECT id FROM beneficiaries WHERE userId = ? AND bank = ? AND accountNumber = ? AND sample = 1', userId, row.bank, row.accountNumber);
  const expected = sample || !env.PAYSTACK_SECRET_KEY ? 'demo' : `paystack-${lookupMode(env)}`;
  if (row.source !== expected) fail(400, 'Refresh the account name before confirming.');
  return lookupFields(row);
}
function cents(value) {
  if (!['number', 'string'].includes(typeof value)) fail(400, 'Invalid amount.');
  const n = Number(value), result = Math.round(n * 100);
  if (!Number.isFinite(n) || result <= 0 || result > 100000000 || Math.abs(n * 100 - result) > 0.000001) fail(400, 'Enter an amount up to NGN 1,000,000 with at most two decimal places.');
  return result;
}
export async function recordOperation(env, userId, operation) {
  const id = crypto.randomUUID();
  const fingerprint = JSON.stringify(operation.fingerprint);
  const previous = await first(env, 'SELECT * FROM payment_operations WHERE userId = ? AND requestId = ?', userId, operation.requestId);
  if (previous) {
    if (previous.fingerprint !== fingerprint) fail(409, 'This confirmation ID was already used for different details. Reopen the review.');
    return { transaction: publicTransaction(await first(env, 'SELECT * FROM transactions WHERE id = ? AND userId = ?', previous.transactionId, userId)), user: publicUser(await first(env, 'SELECT * FROM visitors WHERE id = ?', userId)), replayed: true };
  }
  const draft = operation.draft;
  if (draft.type === 'Transfer') Object.assign(draft, await checkedResolution(env, userId, draft));
  const details = draft.type === 'Transfer' ? `To: ${draft.recipientName} | Account: ${draft.accountNumber} | ${draft.accountNameSource === 'demo' ? 'Simulated account name' : 'Payments here remain simulated.'} | Simulated transfer` : operation.details;
  try {
    await stmt(env, `INSERT INTO payment_operations VALUES (${Array(17).fill('?').join(',')}) ON CONFLICT(userId, requestId) DO NOTHING`,
      userId, operation.requestId, fingerprint, id, operation.delta, draft.type, operation.provider, draft.phone || null, details || null, new Date().toISOString(), `PG-${crypto.randomUUID()}`,
      draft.accountResolutionId || '', draft.bank || '', draft.accountNumber || '', draft.recipientName || '', draft.accountNameSource || '', draft.beneficiaryId || '').run();
  } catch (error) {
    const messages = { insufficient_balance: 'Insufficient demo wallet balance. Add demo money first.', wallet_limit: 'Demo wallet limit reached.', lookup_expired: 'Look up the account name again before confirming.', beneficiary_changed: 'This beneficiary changed. Review it again.', session_expired: 'Start a new demo session.' };
    for (const [code, message] of Object.entries(messages)) if (error.message.includes(code)) fail(400, message);
    throw error;
  }
  const stored = await first(env, 'SELECT * FROM payment_operations WHERE userId = ? AND requestId = ?', userId, operation.requestId);
  if (stored.fingerprint !== fingerprint) fail(409, 'This confirmation ID was already used for different details. Reopen the review.');
  return { transaction: publicTransaction(await first(env, 'SELECT * FROM transactions WHERE id = ? AND userId = ?', stored.transactionId, userId)), user: publicUser(await first(env, 'SELECT * FROM visitors WHERE id = ?', userId)), replayed: stored.transactionId !== id };
}
async function route(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (request.method === 'GET' && path === '/api/health') return { ok: true, database: 'd1', demo: true, publicDemo: true };
  if (request.method === 'POST') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) fail(403, 'Use the demo website to make this request.');
  }
  if (request.method === 'POST' && path === '/api/auth/demo') { await readBody(request); return createVisitor(request, env); }
  if (['/api/auth/signup', '/api/auth/signin'].includes(path)) fail(403, 'Use Try demo to start your own private session.');
  const user = await authenticate(request, env);
  if (request.method === 'GET') {
    if (path === '/api/auth/session') return { user: publicUser(user) };
    if (path === '/api/transactions') return { transactions: (await all(env, 'SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, rowid DESC LIMIT 200', user.id)).map(publicTransaction) };
    if (path === '/api/beneficiaries') return { beneficiaries: await saved(env, user.id) };
    if (path === '/api/payment-assistant') return { mode: env.GROQ_API_KEY ? 'ai' : 'local' };
    if (path === '/api/account-lookup') return { mode: lookupMode(env) };
    fail(404, 'Not found.');
  }
  if (request.method !== 'POST') fail(405, 'Method not allowed.');
  await reserveQuota(env, [[`actions:user:${user.id}`, 30, 60000]]);
  const body = await readBody(request);
  if (path === '/api/auth/signout') { await stmt(env, 'DELETE FROM sessions WHERE userId = ?', user.id).run(); return { ok: true }; }
  if (path === '/api/demo/reset') {
    await env.DB.batch([
      stmt(env, 'DELETE FROM payment_operations WHERE userId = ?', user.id), stmt(env, 'DELETE FROM transactions WHERE userId = ?', user.id),
      stmt(env, 'DELETE FROM account_resolutions WHERE userId = ?', user.id), stmt(env, 'DELETE FROM beneficiaries WHERE userId = ? AND sample = 0', user.id),
      stmt(env, 'UPDATE visitors SET balance = 15700000 WHERE id = ?', user.id),
    ]);
    return { user: publicUser(await first(env, 'SELECT * FROM visitors WHERE id = ?', user.id)), beneficiaries: await saved(env, user.id), transactions: [] };
  }
  if (path === '/api/accounts/resolve') return { account: await resolveAccount(env, user.id, clean(body.bank), clean(body.accountNumber).replace(/\s/g, '')) };
  if (path === '/api/beneficiaries/delete') {
    const result = await stmt(env, 'DELETE FROM beneficiaries WHERE id = ? AND userId = ? AND sample = 0', clean(body.id), user.id).run();
    if (!result.meta.changes) fail(404, 'Beneficiary not found, or it is a fictional sample.');
    return { beneficiaries: await saved(env, user.id) };
  }
  if (path === '/api/beneficiaries/save') {
    const item = { id: clean(body.id) || crypto.randomUUID(), name: clean(body.name), nickname: clean(body.nickname), bank: clean(body.bank), accountNumber: clean(body.accountNumber) };
    if (!item.name || item.name.length > 80 || item.nickname.length > 80 || !banks.includes(item.bank) || !/^\d{10}$/.test(item.accountNumber)) fail(400, 'Enter a name, bank and 10-digit account number.');
    if (body.id && !await first(env, 'SELECT id FROM beneficiaries WHERE id = ? AND userId = ? AND sample = 0', item.id, user.id)) fail(404, 'Beneficiary not found, or it is a fictional sample.');
    if (!body.id && (await first(env, 'SELECT count(*) AS count FROM beneficiaries WHERE userId = ?', user.id)).count >= 20) fail(400, 'The demo supports up to 20 saved beneficiaries.');
    const resolved = body.accountResolutionId ? await checkedResolution(env, user.id, { ...item, accountResolutionId: body.accountResolutionId }) : await resolveAccount(env, user.id, item.bank, item.accountNumber);
    Object.assign(item, resolved);
    if (body.id) {
      const result = await stmt(env, 'UPDATE beneficiaries SET name = ?, nickname = ?, bank = ?, accountNumber = ?, recipientName = ?, accountNameSource = ?, accountNameResolvedAt = ? WHERE id = ? AND userId = ? AND sample = 0', item.name, item.nickname, item.bank, item.accountNumber, item.recipientName, item.accountNameSource, item.accountNameResolvedAt, item.id, user.id).run();
      if (!result.meta.changes) fail(404, 'Beneficiary no longer exists.');
    } else await stmt(env, 'INSERT INTO beneficiaries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', item.id, user.id, item.name, item.nickname, item.bank, item.accountNumber, item.recipientName, item.accountNameSource, item.accountNameResolvedAt).run();
    return { beneficiary: item, beneficiaries: await saved(env, user.id) };
  }
  if (path === '/api/payment-drafts') {
    const assistant = createPaymentAssistant({ key: env.GROQ_API_KEY || '', model: env.GROQ_MODEL || 'openai/gpt-oss-120b', fetchImpl: (url, options) => providerFetch(env, user.id, url, options) });
    const result = await assistant.prepare(body.text, await saved(env, user.id), user.id);
    if (result.draft.type === 'Transfer') {
      result.draft.recipientName = '';
      if (result.draft.bank && result.draft.accountNumber) {
        try { Object.assign(result.draft, await resolveAccount(env, user.id, result.draft.bank, result.draft.accountNumber)); }
        catch (error) { result.draft.accountLookupError = error.status ? error.message : 'Account lookup is unavailable. Please try again.'; }
      }
    }
    return result;
  }
  if (path === '/api/payments/confirm') {
    if (body.pin !== '1234') fail(400, 'Incorrect demo PIN. Use 1234.');
    const requestId = clean(body.requestId);
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) fail(400, 'Missing payment confirmation ID. Reopen the review.');
    const draft = { type: body.type, amount: body.amount, phone: normalizePhone(body.phone), provider: clean(body.provider), bank: clean(body.bank), accountNumber: clean(body.accountNumber), recipientName: clean(body.recipientName), beneficiaryId: clean(body.beneficiaryId), accountResolutionId: clean(body.accountResolutionId) };
    const validation = validatePayment(draft);
    if (validation) fail(400, validation);
    draft.amount = cents(draft.amount) / 100;
    return recordOperation(env, user.id, { requestId, fingerprint: { ...draft, accountResolutionId: undefined }, draft, delta: -cents(draft.amount), provider: draft.type === 'Transfer' ? draft.bank : draft.provider, details: 'Simulated airtime top-up' });
  }
  if (path === '/api/wallet/fund' || path === '/api/payments') {
    const funding = path.endsWith('/fund'), value = cents(body.amount);
    if (!funding && (!['Airtime', 'Data', 'Electricity', 'Cable TV', 'Internet', 'Water'].includes(body.type) || !clean(body.provider) || clean(body.provider).length > 80)) fail(400, 'Choose a valid service and provider.');
    return recordOperation(env, user.id, { requestId: crypto.randomUUID(), fingerprint: {}, draft: { type: funding ? 'Wallet Funding' : body.type, phone: clean(body.phone).slice(0, 40) }, delta: funding ? value : -value, provider: funding ? 'Demo credit' : clean(body.provider), details: clean(body.details).slice(0, 500) });
  }
  fail(404, 'Not found.');
}
export async function cleanup(env) {
  const now = Date.now();
  await env.DB.batch([
    stmt(env, 'DELETE FROM visitors WHERE id IN (SELECT id FROM visitors WHERE expires <= ? LIMIT 500)', now),
    stmt(env, 'DELETE FROM quotas WHERE expires <= ?', now),
    stmt(env, 'DELETE FROM account_resolutions WHERE expiresAt <= ?', now),
    stmt(env, 'DELETE FROM provider_cache WHERE expires <= ?', now),
  ]);
}
export default {
  async fetch(request, env) {
    if (!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try { return json(await route(request, env)); }
    catch (error) {
      if (!error.status) console.error('Public demo request failed:', error.name);
      return json({ error: error.status ? error.message : 'The demo is temporarily unavailable. Please try again.' }, error.status || 503);
    }
  },
  async scheduled(_controller, env) { await cleanup(env); },
};
