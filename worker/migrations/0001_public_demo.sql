PRAGMA foreign_keys = ON;
CREATE TABLE visitors (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL DEFAULT 15700000 CHECK(balance >= 0 AND balance <= 100000000000), expires INTEGER NOT NULL
) STRICT;
CREATE INDEX visitors_expiry ON visitors(expires);
CREATE TABLE sessions (token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE, expires INTEGER NOT NULL) STRICT;
CREATE TABLE beneficiaries (
 id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
 name TEXT NOT NULL, nickname TEXT NOT NULL DEFAULT '', bank TEXT NOT NULL, accountNumber TEXT NOT NULL, recipientName TEXT NOT NULL,
 accountNameSource TEXT NOT NULL, accountNameResolvedAt INTEGER NOT NULL, sample INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE INDEX beneficiaries_user ON beneficiaries(userId);
CREATE TABLE account_resolutions (
 id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE, bank TEXT NOT NULL, accountNumber TEXT NOT NULL,
 recipientName TEXT NOT NULL, source TEXT NOT NULL, resolvedAt INTEGER NOT NULL, expiresAt INTEGER NOT NULL
) STRICT;
CREATE INDEX resolutions_user_account ON account_resolutions(userId, bank, accountNumber, source, expiresAt);
CREATE TABLE transactions (
 id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE, type TEXT NOT NULL, provider TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount > 0), phone TEXT, details TEXT, date TEXT NOT NULL, status TEXT NOT NULL, reference TEXT NOT NULL UNIQUE
) STRICT;
CREATE INDEX transactions_user_date ON transactions(userId, date DESC);
CREATE TABLE payment_operations (
 userId TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE, requestId TEXT NOT NULL, fingerprint TEXT NOT NULL,
 transactionId TEXT NOT NULL UNIQUE, delta INTEGER NOT NULL CHECK(delta != 0 AND abs(delta) <= 100000000),
 type TEXT NOT NULL, provider TEXT NOT NULL, phone TEXT, details TEXT, date TEXT NOT NULL, reference TEXT NOT NULL,
 resolutionId TEXT NOT NULL DEFAULT '', bank TEXT NOT NULL DEFAULT '', accountNumber TEXT NOT NULL DEFAULT '',
 recipientName TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', beneficiaryId TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(userId, requestId)
) STRICT;
-- Use SELECT RAISE ... WHERE so the remote D1 splitter cannot confuse CASE END with the trigger END.
-- A single insert validates and changes the wallet and ledger together, even across Worker instances.
CREATE TRIGGER record_payment AFTER INSERT ON payment_operations BEGIN
 SELECT RAISE(ABORT, 'session_expired') WHERE (SELECT expires FROM visitors WHERE id = NEW.userId) <= unixepoch('now') * 1000;
 SELECT RAISE(ABORT, 'insufficient_balance') WHERE (SELECT balance FROM visitors WHERE id = NEW.userId) + NEW.delta < 0;
 SELECT RAISE(ABORT, 'wallet_limit') WHERE (SELECT balance FROM visitors WHERE id = NEW.userId) + NEW.delta > 100000000000;
 SELECT RAISE(ABORT, 'lookup_expired') WHERE NEW.type = 'Transfer' AND NOT EXISTS (
  SELECT 1 FROM account_resolutions WHERE id = NEW.resolutionId AND userId = NEW.userId AND bank = NEW.bank AND accountNumber = NEW.accountNumber
  AND recipientName = NEW.recipientName AND source = NEW.source AND expiresAt > unixepoch('now') * 1000
 );
 SELECT RAISE(ABORT, 'beneficiary_changed') WHERE NEW.beneficiaryId != '' AND NOT EXISTS (
  SELECT 1 FROM beneficiaries WHERE id = NEW.beneficiaryId AND userId = NEW.userId AND bank = NEW.bank AND accountNumber = NEW.accountNumber
 );
 UPDATE visitors SET balance = balance + NEW.delta WHERE id = NEW.userId;
 INSERT INTO transactions VALUES(NEW.transactionId, NEW.userId, NEW.type, NEW.provider, abs(NEW.delta), NEW.phone, NEW.details, NEW.date, 'success', NEW.reference);
END;
CREATE TABLE quotas (key TEXT PRIMARY KEY, count INTEGER NOT NULL, maximum INTEGER NOT NULL, expires INTEGER NOT NULL, CHECK(count <= maximum)) STRICT;
CREATE INDEX quotas_expiry ON quotas(expires);
CREATE TABLE provider_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL) STRICT;
