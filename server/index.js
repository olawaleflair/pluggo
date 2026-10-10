import './env.js';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, atomic, insertTransaction } from './store.js';
import { handlePaymentRoute } from './paymentRoutes.js';
const PORT = Number(process.env.PORT || 4000);
const demoUserEmail = 'olawale@example.com';
const demoUserPassword = 'Password123!';
function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, hashHex] = passwordHash.split(':');
  if (!salt || !hashHex) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function defaultDb() {
  const userId = randomUUID();
  return {
    users: [
      {
        id: userId,
        name: 'Olawale',
        email: demoUserEmail,
        phone: '08012345678',
        passwordHash: hashPassword(demoUserPassword),
        walletBalance: 45750,
        createdAt: nowIso(),
      },
    ],
    sessions: [],
    transactions: [
      { id: randomUUID(), userId, type: 'Airtime', provider: 'MTN', amount: 1000, phone: '08012345678', date: '2026-02-20T10:30:00', status: 'success', reference: 'BG-20260220-001' },
      { id: randomUUID(), userId, type: 'Data', provider: 'Glo', amount: 500, details: '2.9GB - 30 days', date: '2026-02-19T14:15:00', status: 'success', reference: 'BG-20260219-002' },
      { id: randomUUID(), userId, type: 'Electricity', provider: 'EKEDC', amount: 5000, details: 'Meter: 45678901234', date: '2026-02-18T09:00:00', status: 'success', reference: 'BG-20260218-003' },
      { id: randomUUID(), userId, type: 'Cable TV', provider: 'DStv', amount: 12500, details: 'Compact - 1 month', date: '2026-02-17T16:45:00', status: 'success', reference: 'BG-20260217-004' },
      { id: randomUUID(), userId, type: 'Airtime', provider: 'Airtel', amount: 500, phone: '08098765432', date: '2026-02-16T11:20:00', status: 'success', reference: 'BG-20260216-005' },
      { id: randomUUID(), userId, type: 'Internet', provider: 'Spectranet', amount: 6500, details: 'Pro - 25GB', date: '2026-02-15T13:00:00', status: 'success', reference: 'BG-20260215-006' },
      { id: randomUUID(), userId, type: 'Data', provider: 'MTN', amount: 1200, details: '5GB - 30 days', date: '2026-02-14T08:30:00', status: 'success', reference: 'BG-20260214-007' },
      { id: randomUUID(), userId, type: 'Electricity', provider: 'IKEDC', amount: 10000, details: 'Meter: 98765432100', date: '2026-02-13T17:00:00', status: 'pending', reference: 'BG-20260213-008' },
      { id: randomUUID(), userId, type: 'Water', provider: 'LSWC', amount: 3500, details: 'Account: WTR-12345', date: '2026-02-12T10:45:00', status: 'success', reference: 'BG-20260212-009' },
      { id: randomUUID(), userId, type: 'Cable TV', provider: 'GOtv', amount: 4250, details: 'Jolli - 1 month', date: '2026-02-11T15:30:00', status: 'success', reference: 'BG-20260211-010' },
    ],
  };
}


function publicUser(u) {
 return { id: u.id, name: u.name, email: u.email, phone: u.phone, walletBalance: u.balance / 100 };
}
if (!db.prepare('SELECT id FROM users LIMIT 1').get()) atomic(() => {
 const seed = defaultDb();
 for (const u of seed.users) db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)').run(
  u.id, u.name, u.email, u.phone, u.passwordHash, u.walletBalance * 100, u.createdAt);
 seed.transactions.forEach(insertTransaction);
});
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function session(req) {
 const token = req.headers.authorization?.replace(/^Bearer /, '') || '';
 const u = db.prepare('SELECT users.* FROM users JOIN sessions ON users.id = sessions.userId WHERE token = ? AND expires > ?').get(token, Date.now());
 if (!u) fail(401, 'Please sign in again.');
 return { user: u, token };
}
function createSession(user) {
 const token = randomBytes(32).toString('hex');
 db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
 db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(token, user.id, Date.now() + 7 * 86400000);
 return { token, user: publicUser(user) };
}
async function body(req) {
 let value = '';
 for await (const chunk of req) {
  value += chunk;
  if (value.length > 100000) fail(413, 'Request too large.');
 }
 try { const parsed = JSON.parse(value || '{}'); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') fail(400, 'Invalid request.'); return parsed; }
 catch { fail(400, 'Invalid JSON request.'); }
}
function amount(value) {
 if (!['number', 'string'].includes(typeof value)) fail(400, 'Invalid amount.');
 const n = Number(value), cents = Math.round(n * 100);
 if (!Number.isFinite(n) || cents <= 0 || cents > 100000000 || Math.abs(n * 100 - cents) > 0.000001) fail(400, 'Enter an amount up to ₦1,000,000 with at most two decimal places.');
 return cents;
}
function transactions(userId) {
 return db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, rowid DESC').all(userId).map(t => ({ ...t, amount: t.amount / 100 }));
}
async function route(req) {
 const path = new URL(req.url, 'http://localhost').pathname;
 if (req.method === 'GET' && path === '/api/health') return { ok: true, database: 'sqlite', demo: true };
 if (req.method === 'POST' && ['/api/auth/signup', '/api/auth/signin'].includes(path)) {
  const b = await body(req);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (password.length > 256) fail(400, 'Password is too long.');
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (path.endsWith('signup')) {
   const name = String(b.name || '').trim(), phone = String(b.phone || '').trim();
   if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) fail(400, 'Enter your name, phone, valid email and a password of at least 8 characters.');
   if (user) fail(409, 'An account with this email already exists.');
   return atomic(() => {
    const id = randomUUID();
    db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, 0, ?)').run(id, name, email, phone, hashPassword(password), nowIso());
    return createSession(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
   });
  }
  if (!user || !verifyPassword(password, user.passwordHash)) fail(401, 'Invalid email or password.');
  return createSession(user);
 }
 const newPaths = ['/api/account-lookup', '/api/accounts/resolve', '/api/payment-assistant', '/api/beneficiaries', '/api/beneficiaries/save', '/api/beneficiaries/delete', '/api/payment-drafts', '/api/payments/confirm'];
 if (!['/api/auth/session', '/api/auth/signout', '/api/transactions', '/api/wallet/fund', '/api/payments', ...newPaths].includes(path)) fail(404, 'Not found.');
 const auth = session(req);
 if (newPaths.includes(path)) return handlePaymentRoute(req, path, auth.user, { body, fail, publicUser });
 if (req.method === 'GET' && path === '/api/auth/session') return { user: publicUser(auth.user) };
 if (req.method === 'POST' && path === '/api/auth/signout') {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(auth.token); return { ok: true };
 }
 if (req.method === 'GET' && path === '/api/transactions') return { transactions: transactions(auth.user.id) };
 if (req.method === 'POST' && ['/api/wallet/fund', '/api/payments'].includes(path)) {
  const b = await body(req), cents = amount(b.amount), funding = path.endsWith('/fund');
  if (!funding && (!['Airtime','Data','Electricity','Cable TV','Internet','Water'].includes(b.type) || typeof b.provider !== 'string' || !b.provider.trim())) fail(400, 'Choose a valid service and provider.');
  return atomic(() => {
   const current = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.user.id);
   if (!funding && current.balance < cents) fail(400, 'Insufficient wallet balance.');
   if (funding && current.balance + cents > 100000000000) fail(400, 'Demo wallet limit reached.');
   db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(funding ? cents : -cents, current.id);
   const t = { id: randomUUID(), userId: current.id, type: funding ? 'Wallet Funding' : b.type,
    provider: funding ? 'Demo credit' : b.provider, amount: cents / 100,
    phone: typeof b.phone === 'string' ? b.phone : null, details: typeof b.details === 'string' ? b.details : null,
    date: nowIso(), status: 'success', reference: 'BG-' + randomUUID() };
   insertTransaction(t);
   return { transaction: t, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(current.id)) };
  });
 }
 fail(405, 'Method not allowed.');
}
const server = createServer(async (req, res) => {
 try {
  const payload = await route(req);
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
 } catch (error) {
  if (!error.status) console.error(error);
  res.writeHead(error.status || 500, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: error.status ? error.message : 'Unable to complete the request.' }));
 }
});
server.listen(PORT, '127.0.0.1', () => console.log(`PlugGo SQLite API: http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
