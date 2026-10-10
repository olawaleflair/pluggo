# PlugGo

A portfolio prototype exploring payments in your own words. Type one transfer or airtime request, review the prepared details, then confirm a simulated payment.

**All wallet funding, transfers and bill payments are simulated. No money moves, no bank account is credited, and no airtime or other service is delivered.** Optional Groq interpretation and Paystack account-name lookup use real external services when you supply your own backend credentials. The app also runs without provider keys.

- [Try the existing demo](https://billsgo.omotosoolawale16.workers.dev/)
- [Read the product case study](https://olawaleflair.github.io/portfolio-case-studies/pluggo/)
- [Watch the approved walkthrough](https://olawaleflair.github.io/portfolio-case-studies/pluggo/pluggo-live-demo-masked.mp4)

This is a source snapshot prepared on 10 October 2026 from implementation commit `6ac71b91c98c3001b30414dce6195dc266185929`. The live demo is maintained separately; this repository does not deploy it or automatically follow its updates. Some internal names still use the project's earlier name, BillsGo.

## Run locally without credentials

Requires Node.js 24 or newer and npm. No Docker, hosted database or provider account is required.

```sh
npm ci
npm run dev
```

Open http://localhost:2500. Vite and the Node API start together; Ctrl+C stops both. The API listens on `127.0.0.1:4000`.

Sign in with the fictional example `olawale@example.com` and `Password123!`. A new local database starts that account with NGN 45,750 and sample transactions. You may also register a fictional account and fund its simulated wallet. These public credentials and shared demo PIN `1234` demonstrate interactions, not financial authorization.

Try `Transfer 5000 to 0000000000 OPay` or `Buy 1000 MTN airtime for 07000000000`. Review every field before confirmation. To try `Send 5k to Thomas` or `Send 5k to my wife` locally, first save a fictional beneficiary with that name or nickname. Matching ignores case and spacing; multiple matches require a choice. The Node version does not seed the Worker's seven beneficiaries.

The local parser supports one transfer or airtime payment per request, amounts in naira, `k` shorthand and simple spoken amounts. Missing bank/network details require completion. A bare number may require a Transfer/Airtime choice. Unsupported or ambiguous requests are rejected or require clarification. Other bill categories remain available through manual forms. The bank catalogue, plans, prices, names and seed history are illustrative, not current commercial offers or provider endorsement. A fictional-looking number can coincide with a real identifier; never use sample numbers for real services.

### Storage and reset

Node uses embedded SQLite at ignored `server/data/billsgo.sqlite`. Profiles, password hashes, sessions, beneficiaries and simulated transactions persist across restarts. Sessions expire after seven days. Amounts use integer kobo; wallet and ledger changes commit together. Repeated confirmation IDs do not debit twice. See [SCHEMA.md](SCHEMA.md).

Treat databases, including `-wal` and `-shm` files, as private. To reset local data, stop the app, move `server/data/` aside privately, then restart. No personal database or credentials are supplied.

If the ports are occupied, start two terminals:

```sh
# Terminal 1: separate API and database
PORT=4011 BILLSGO_DB_PATH=/tmp/pluggo-demo.sqlite npm run api
```

```sh
# Terminal 2: frontend connected to that API
BILLSGO_API_PORT=4011 npx vite --port 2511 --host 127.0.0.1
```

Open http://127.0.0.1:2511. `/tmp` storage is temporary; do not use it for data you need to retain.

## Optional AI and recipient-name lookup

Copy blank `.env.example` to ignored `.env.local` and add only your own credentials:

- `GROQ_API_KEY` enables AI interpretation. `GROQ_MODEL` defaults to `openai/gpt-oss-120b`; model availability depends on your account.
- `PAYSTACK_SECRET_KEY` enables backend bank-list/account-name lookup. Start with a test key and follow current provider permissions and limits.
- `BILLSGO_DB_PATH` optionally sets a different local database path.

Restart the backend after changes. Shell environment settings take priority over `.env.local`. Never put secrets in a `VITE_` variable, source file, screenshot or public issue.

Typed payment text goes to Groq, including any account/phone number you type. The AI request excludes saved beneficiaries, wallet, history, session and PIN. Bank/account details go to Paystack for lookup. A returned name does not establish account ownership. Use fictional details unless deliberately testing your own lookup integration.

Groq prepares a draft, never a confirmation. Validation, beneficiary matching and review remain mandatory. Missing keys or provider failures may use the visibly labelled local parser. Without Paystack, names are explicitly fictional; with a key configured, lookup failure blocks confirmation rather than fabricating a name. Changing recipient details invalidates the old proof.

Local usage limits are per backend process and reset on restart; Worker limits use shared database records. These are demo controls, not production abuse-prevention guarantees. Provider/hosting charges and limits depend on your account; free operation is not promised.

`npm run prove:ai` makes up to nine real Groq requests with fictional inputs. It consumes your allowance, never confirms a payment, and is separate from normal setup/tests. The small phrase set does not establish general model accuracy.

## Run the Worker version locally

This experience uses Cloudflare Workers and D1 instead of the Node API. The config has a placeholder database ID and a separate Worker name. Local commands need no Cloudflare login.

```sh
npm ci
npm run db:local
npm run dev:public
```

Open http://localhost:8787 and select **Try demo**. Each visitor gets a separate NGN 157,000 wallet and seven fictional beneficiaries: Thomas, Ada, Emeka, Mum, Dad, Zainab and Tunde. Built-in sample account lookups never call Paystack. Try `Send 5k to my wife`, then review and confirm using demo PIN `1234`.

Sessions expire after 24 hours. Hosted hourly cleanup removes expired records; local scheduled events do not automatically run like hosted cron events. Reset demo restores the visitor balance and clears that visitor's history and added beneficiaries; shared usage limits remain. D1 storage is independent of the Node database.

Optional Worker credentials belong in ignored `.dev.vars`, copied from blank `.dev.vars.example`. They are not read from Node's `.env.local` and are not uploaded by deployment. Do not add remote bindings when testing locally.

### Deploy your own copy, optionally

These commands change your Cloudflare account. They are not required to inspect or run the code locally.

1. Choose your own Worker `name` in `wrangler.jsonc`, retaining the `DB` binding and migrations directory. The all-zero `database_id` is a local placeholder.
2. Authenticate Wrangler and create your own database:

   ```sh
   npx wrangler login
   npx wrangler d1 create pluggo-demo
   ```

3. Replace the placeholder with **your** database ID. If changing `database_name`, update the `db:local` and `db:remote` scripts too. Do not use the existing demo's resources or credentials.
4. Apply the schema to your database, then build and publish your own Worker:

   ```sh
   npm run db:remote
   npm run deploy:public
   ```

5. Optionally add `GROQ_API_KEY` and `PAYSTACK_SECRET_KEY` as secrets directly in your Worker's dashboard. Secret updates may deploy a new version. Local `.dev.vars` is not a secret-upload mechanism.
6. Verify your own URL, session isolation, interpretation source, lookup, simulated confirmation and reset. Keep previews disabled until they have a separate database.

The config retains the reviewed runtime compatibility date. Hosting the Node version requires a backend process and persistent storage; a static upload alone is insufficient. See [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/) and [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Checks and commands

```sh
npm run lint
npm test
npm run test:worker
npm run build
npm run build:public
```

Tests use temporary databases and fake providers. They cover isolation, interpretation, lookup validation, duplicate confirmation, concurrent spending, expiry and reset. Worker unit tests use an SQLite adapter; Wrangler testing additionally checks the actual Workers/D1 runtime. Neither establishes live model accuracy, provider availability or production financial-service readiness. Node may print an experimental SQLite warning.

`npm run api` starts only the Node backend. `npm run preview` serves the current frontend build; for a Node build, run the API separately. A public-mode build expects Worker endpoints and should be served through `dev:public`. Both builds write `dist/`; rebuild the intended mode before previewing.

## License and reuse

Copyright (c) 2026 Olawale Omotoso. Code is under the [MIT license](LICENSE), including commercial and closed-source reuse, with preservation of the copyright/license notice. Third-party packages retain their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

You are welcome to fork and reuse this project. I am not actively seeking contributions or promising ongoing support. Develop changes in your own fork. Reuse rights do not depend on contributing changes back.

Linked case-study/video materials are separate; MIT does not relicense them or third-party brands. This source contains no real payment execution integration. Turning it into a financial service requires separate product, security and integration work.
