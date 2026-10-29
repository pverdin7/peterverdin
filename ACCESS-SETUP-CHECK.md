# ACCESS CODE — WHAT MUST BE CONFIGURED

**The existing code is not bundled into GitHub and was not changed.** Its value must be entered as the Cloudflare secret `PORTFOLIO_PASSWORD` on the deployment that serves the site. Never commit that value to GitHub.

**Prior cause:** When the site ran at a `workers.dev` URL, `/api/config` returned HTTP 404: the previous package only had Pages Functions, which Workers static-assets deployment does not automatically run. The package now has TWO supported entrypoints: `functions/api/[[path]].js` for **Pages** and `worker/index.js` + `wrangler.worker.example.toml` for **Workers**. Choose exactly one deployment type.

## Option A — keep existing Workers address
1. Copy `wrangler.worker.example.toml` to `wrangler.worker.toml`. Fill the real D1 ID, R2 bucket, Turnstile site key and other non-secret values. Verify the `name` equals the deployed Worker name.
2. In Cloudflare, ensure R2 is private and D1 tables were initialized using `schema.sql`.
3. Set the **Worker secrets** through Cloudflare or `npx wrangler secret put KEY --config wrangler.worker.toml` for `PORTFOLIO_PASSWORD`, `RATE_LIMIT_SALT` (32+ random characters), `TURNSTILE_SECRET_KEY`, `OWNER_PASSWORD` (separate, 20+ characters), and `RESEND_API_KEY` when email requests are enabled. The shared code is intentionally not written anywhere in this package.
4. Deploy with `npx wrangler deploy --config wrangler.worker.toml`. If connecting GitHub through Workers Builds, make its deploy command use that exact config and confirm it does not publish just static assets.
5. **Check first:** `https://<actual-worker-address>/api/config` must give JSON (never a 404). `ready` and `passwordReady` must be `true`; `missing` must be empty. `requestsReady` can remain false until Resend is configured, without blocking the shared access code.
6. Ensure the Cloudflare Turnstile widget allows the actual hostname. The backend validates the Turnstile hostname and action; mismatches cause a security error, not a password error.
7. Enter the visitor code on the website, then confirm that a private case loads. This additionally requires `case-studies.json` and protected originals in the private R2 bucket. Without these, login can succeed but the content will be missing.

## Option B — use Pages
1. Use `wrangler.example.toml` as `wrangler.toml` with your actual `pages.dev` origin, D1/R2 bindings and Turnstile key, and deploy as **Pages** with `functions/` at repo root.
2. Set secrets via `npx wrangler pages secret put KEY --project-name YOUR_PAGES_PROJECT`.
3. Check the Pages URL `/api/config` and the same password login flow as above.

## Readiness logic, fixed in this version
`passwordReady` requires only D1, private R2, the visitor password secret, rate-limit salt, and both Turnstile keys. It deliberately does not depend on Resend, the separate owner password, or mail-sending origin. `requestsReady` requires email variables and `SITE_ORIGIN`; approvals need it too. `ownerReady` requires the separate owner password. Private content is still only returned after a valid server-side session; every login attempt is rate-limited and Turnstile verified.

Never add sample PDFs, videos, the owner preview, actual `.dev.vars`, or secrets to the GitHub repository. Store originals in your *private* R2 bucket.

## If `/api/config` says `passwordReady:false`
The `missing` field names the missing **types of configuration**, not values. Possible entries: `DB`, `PRIVATE_ASSETS`, `RATE_LIMIT_SALT`, `TURNSTILE_KEYS`, `PORTFOLIO_PASSWORD`. Set these for the **same deployment environment** serving the website and redeploy as needed. Do not send the values to ChatGPT.

If the endpoint still returns HTML or 404, the API backend is not deployed; changing the CSS, password, or domain will not fix it. Do not change Wix/domain DNS until the test succeeds.
