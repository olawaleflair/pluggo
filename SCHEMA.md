# Storage models

Both runtimes use integer kobo for balances and ledger amounts. Databases are private; only schema, migrations and fictional seed definitions are distributed.

## Node / SQLite

Defined in `server/store.js`, seeded by `server/index.js`.

| Table | Purpose |
| --- | --- |
| `users` | Local profile, unique email, scrypt password hash and simulated balance |
| `sessions` | Random bearer token, user and seven-day expiry; sign-out revokes the current session |
| `transactions` | User-scoped simulated ledger and unique reference |
| `beneficiaries` | Names/nicknames, bank/account, resolved name, source and lookup time |
| `account_resolutions` | Ten-minute user-bound bank/account lookup proofs |
| `payment_requests` | User/request ID, confirmation fingerprint and transaction ID for duplicate protection |

Wallet/ledger changes use transactions and rollback on failure. Beneficiary edits do not rewrite completed history. Default path: `server/data/billsgo.sqlite`; optional override: `BILLSGO_DB_PATH`. Local data is not imported into D1 or distributed.

## Worker / D1

Defined in `worker/migrations/0001_public_demo.sql`, used by `worker/index.js`.

| Table | Purpose |
| --- | --- |
| `visitors` | Private demo wallet, name and 24-hour expiry; no registered-account/password model |
| `sessions` | Hashed bearer token, visitor and expiry |
| `beneficiaries` | Visitor-scoped recipient details, provenance and fictional-sample marker |
| `account_resolutions` | Visitor-bound lookup proofs with expiry |
| `transactions` | Visitor-scoped simulated ledger |
| `payment_operations` | Unique visitor/request pair, fingerprint, balance delta and recipient proof |
| `quotas` | Shared usage counters and expiry |
| `provider_cache` | Cached bank directory responses and expiry |

An operation insert and trigger validate wallet limits, session expiry and transfer proof, then change wallet and ledger together. Unique operation IDs prevent repeated debits. Reset clears the visitor's activity/custom beneficiaries, restores samples and preserves shared quotas. Hosted hourly cleanup deletes expired visitors and related rows through cascades, and clears expired proofs, quotas and cache.

Account details, resolved names, sessions and history remain private despite simulated payments. Never publish exports or WAL/SHM files.
