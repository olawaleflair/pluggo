# Release notes

## 2026-10-10 source snapshot

Source implementation: `6ac71b91c98c3001b30414dce6195dc266185929`.

- Typed transfer/airtime drafts, clarification, review and simulated confirmation.
- Self-contained Node/SQLite and visitor-based Worker/D1 runtimes with existing tests.
- Optional Groq interpretation and read-only Paystack lookup, separate from simulated payments.
- MIT license, owner attribution, reuse wording and refreshed setup/schema documentation.
- Owner deployment identifiers replaced by local placeholders; blank Worker credential examples added.
- Private data, credentials, captures, installed dependencies, generated builds, unused starter logos and historical Supabase/Flutterwave integration excluded.
- Page metadata now describes a simulated portfolio prototype rather than instant bill payments.

Payment and authentication code is unchanged from the implementation commit. The existing demo, approved case study and walkthrough are maintained separately. This snapshot does not execute real payments or deploy the existing demo.
