import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const path = process.env.BILLSGO_DB_PATH || fileURLToPath(new URL('./data/billsgo.sqlite', import.meta.url));
mkdirSync(dirname(resolve(path)), { recursive: true });
export const db = new DatabaseSync(path);
db.exec(`
 PRAGMA foreign_keys = ON;
 PRAGMA journal_mode = WAL;
 PRAGMA busy_timeout = 5000;
 CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL, passwordHash TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0 AND balance <= 100000000000), createdAt TEXT NOT NULL
 ) STRICT;
 CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
 ) STRICT;
 CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, provider TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0),
  phone TEXT, details TEXT, date TEXT NOT NULL, status TEXT NOT NULL, reference TEXT NOT NULL UNIQUE
 ) STRICT;
 CREATE INDEX IF NOT EXISTS transactions_user_date ON transactions(userId, date DESC);
 CREATE TABLE IF NOT EXISTS beneficiaries (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, nickname TEXT NOT NULL DEFAULT '', bank TEXT NOT NULL,
  accountNumber TEXT NOT NULL, recipientName TEXT NOT NULL
 ) STRICT;
 CREATE INDEX IF NOT EXISTS beneficiaries_user ON beneficiaries(userId);
 CREATE TABLE IF NOT EXISTS account_resolutions (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id),
  bank TEXT NOT NULL, accountNumber TEXT NOT NULL, recipientName TEXT NOT NULL,
  source TEXT NOT NULL, resolvedAt INTEGER NOT NULL, expiresAt INTEGER NOT NULL
 ) STRICT;
 CREATE INDEX IF NOT EXISTS account_resolutions_user ON account_resolutions(userId);
 CREATE TABLE IF NOT EXISTS payment_requests (
  userId TEXT NOT NULL REFERENCES users(id), requestId TEXT NOT NULL,
  fingerprint TEXT NOT NULL, transactionId TEXT NOT NULL REFERENCES transactions(id),
  PRIMARY KEY (userId, requestId)
 ) STRICT;
`);
// Add lookup provenance to existing saved beneficiaries without replacing data.
const beneficiaryColumns = new Set(db.prepare('PRAGMA table_info(beneficiaries)').all().map(column => column.name));
if (!beneficiaryColumns.has('accountNameSource')) db.exec("ALTER TABLE beneficiaries ADD COLUMN accountNameSource TEXT NOT NULL DEFAULT 'unverified'");
if (!beneficiaryColumns.has('accountNameResolvedAt')) db.exec('ALTER TABLE beneficiaries ADD COLUMN accountNameResolvedAt INTEGER NOT NULL DEFAULT 0');
export function atomic(action) {
 db.exec('BEGIN IMMEDIATE');
 try { const result = action(); db.exec('COMMIT'); return result; }
 catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function insertTransaction(t) {
 db.prepare('INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  t.id, t.userId, t.type, t.provider, Math.round(t.amount * 100), t.phone || null,
  t.details || null, t.date, t.status, t.reference);
}
