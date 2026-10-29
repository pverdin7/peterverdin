# Deployment and domain cutover

**Assemble the owner files first:** Extract `Peter-Verdin-Cloudflare-Build.zip` and `Peter-Verdin-Learning-Videos.zip`. Copy the companion’s three supplied original videos—`hbu-introduction.mp4`, `athletic-stance.mp4`, and `healthy-body-webinar.mp4`—into the main build’s `private/originals/`. The main 19 downloads plus these three provide all 22 files for the commands below. Keep both owner archives local; use the extracted contents of `Peter-Verdin-GitHub-Ready.zip` for GitHub.

**This package has not been deployed. No Cloudflare resources, live secrets, email service, or DNS changes have been configured by preparing it.** First deploy to a separate `pages.dev` address and test the real workflow. Keep Wix and the existing domain connection unchanged until the final section.

This build retains the established **Cloudflare Pages + Pages Functions + D1 + private R2** architecture. Use the GitHub route below for ongoing updates; a local Wrangler alternative is included in section 8.

## 1. Prepare the complete local package

Keep the assembled folder as the owner copy. It contains private case-study text, original work samples, launch settings, and an owner preview.

Install **Node.js 24 or newer** and run these commands from the folder containing `package.json`:

```sh
npm ci
npm run check
npm test
npm run assets:check
```

`npm ci` installs the locked toolchain, including Wrangler **4.155.0**. The asset check should report **15 case studies, 22 included downloads, 1 hosted video, and 1 request-only sample**: 24 unique entries in total. Only the Movement program update video remains outstanding.

For a design review, open `owner-review/Peter-Verdin-Preview.html` locally. It includes private case-study text and simulated access interactions. **Never deploy this HTML.** `npm run preview` serves only the public pages and requires Python 3; it does not run the API.

## 2. Recommended: private GitHub repository → Pages

### Repository contents

Create a **private GitHub repository** for this portfolio. Include:

- `public/`, `functions/`, `scripts/`, and `tests/`
- `package.json`, `package-lock.json`, and `schema.sql`
- `.gitignore`, `.dev.vars.example`, and `wrangler.example.toml`
- `README.md`, `START-HERE.md`, `DEPLOYMENT.md`, and `ASSETS-NEEDED.md`
- A completed `wrangler.toml` later, containing only the nonsecret configuration described below

Keep `private/`, `owner-review/`, `verification/`, `node_modules/`, `.wrangler/`, `.build/`, actual `.dev.vars`/`.env` files, and all real secrets out of the repository. The existing visitor code is in `private/LAUNCH-SETTINGS.md`; that file stays in the owner copy.

**GitHub’s web file uploader does not apply `.gitignore` for you. Upload the GitHub-ready ZIP’s extracted contents, or select only the allowed files above; keep both owner ZIPs and the entire owner folder out.** With Git or GitHub Desktop, review the staged file list before committing. An ignore rule does not remove a file already tracked by Git.

### Connect Cloudflare Pages

In Cloudflare, create a **Pages** application connected to that repository. Use:

| Setting | Value |
|---|---|
| Project name | `peter-verdin`, or an available name you choose |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run check` |
| Build output directory | `public` |
| Root directory | Repository root |
| Build environment variable | `NODE_VERSION=24` |

The public files are already built; the command validates them. Keep `functions/` beside `public/`, not inside it. Pages supports private GitHub repositories and deploys connected commits. Node’s build version can be selected with `NODE_VERSION`. See the [Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/) and [build-image reference](https://developers.cloudflare.com/pages/configuration/build-image/).

Record the **actual HTTPS `pages.dev` origin** Cloudflare assigns. The project’s `main` branch is called its production environment even while it is only being reviewed on `pages.dev`; this does not connect the Wix domain.

An initial deployment can display the public site while the access services are incomplete. The access API reports that it is not connected; it does not simulate a successful submission.

## 3. Create D1 and private R2

From the complete local package, authenticate and create the resources:

```sh
npx wrangler login
npx wrangler d1 create peter-verdin-access
npx wrangler r2 bucket create peter-verdin-private
cp wrangler.example.toml wrangler.toml
```

On Windows, use your shell’s file-copy command if `cp` is unavailable. Reuse an existing resource only if it is the intended portfolio resource. Copy the D1 identifier returned by Cloudflare into `database_id` in `wrangler.toml`.

Keep these binding names unchanged; the API uses them:

| Type | Binding | Default resource name |
|---|---|---|
| D1 | `DB` | `peter-verdin-access` |
| R2 | `PRIVATE_ASSETS` | `peter-verdin-private` |

Initialize the remote database:

```sh
npx wrangler d1 execute DB --remote --file schema.sql
```

Leave the R2 bucket’s **public `r2.dev` access disabled** and attach **no public custom domain** to it. The website API is the route to private objects. Cloudflare documents the [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/), [D1 commands](https://developers.cloudflare.com/workers/wrangler/commands/d1/), and [R2 public-access settings](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## 4. Set nonsecret configuration, email, and Turnstile

Fill every example value in `wrangler.toml`:

| Variable | Value during the separate review |
|---|---|
| `SITE_ORIGIN` | The actual `https://…pages.dev` origin, with no trailing slash. |
| `ADMIN_EMAIL` | `goldinthecracksofficial@gmail.com` |
| `REPLY_TO` | `goldinthecracksofficial@gmail.com` |
| `EMAIL_FROM` | A sender on a domain you own and have verified with Resend. |
| `TURNSTILE_SITE_KEY` | The public site key for the widget used on the review hostname. |

The file’s `name` must match the Pages project. If you chose different database or bucket names, update their resource names while retaining the binding names `DB` and `PRIVATE_ASSETS`.

### Resend

Create or use a Resend account, verify a sending domain you control, and install the DNS records Resend supplies. Configure a sender such as `Peter Verdin <access@peterverdin.com>` only after that domain has been verified.

**The Gmail address receives notifications and replies; it cannot be the Resend `EMAIL_FROM` address.** Resend requires a domain you own, rather than a shared public email domain. Its verification can be prepared with the current DNS provider; it does not itself require moving website hosting. Preserve existing mail records when adding the requested records. See [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction) and the [email API](https://resend.com/docs/api-reference/emails/send-email).

### Turnstile

Create a Cloudflare Turnstile widget and allow the actual review hostname. Add production hostnames when preparing the final cutover. The backend checks the returned hostname and action; an arbitrary deployment URL is not interchangeable with the hostname you tested. Tokens expire after five minutes and are single-use. See [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Keep runtime variables and bindings together in `wrangler.toml`. Once deployed, that file is their source of truth. If you later use `env.preview` overrides, repeat all non-inheritable variables and bindings there and use separate preview resources. Do not accidentally share production private files with branch tests. See [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## 5. Set the five secrets

Set the secrets for the Pages project’s **production environment**, which serves its main `pages.dev` address. Replace `peter-verdin` in these commands if you chose another project name:

```sh
npx wrangler pages secret put RESEND_API_KEY --project-name peter-verdin
npx wrangler pages secret put OWNER_PASSWORD --project-name peter-verdin
npx wrangler pages secret put PORTFOLIO_PASSWORD --project-name peter-verdin
npx wrangler pages secret put RATE_LIMIT_SALT --project-name peter-verdin
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name peter-verdin
```

Enter values at the prompts:

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | The actual Resend API key. |
| `OWNER_PASSWORD` | A unique owner secret of **20–200 characters**, different from the visitor code. |
| `PORTFOLIO_PASSWORD` | The existing visitor access code recorded in `private/LAUNCH-SETTINGS.md`. |
| `RATE_LIMIT_SALT` | A random secret of at least 32 characters. |
| `TURNSTILE_SECRET_KEY` | The secret paired with the configured Turnstile site key. |

Use a password manager to create and retain the owner secret and salt. Do not put secret values in `wrangler.toml`, browser JavaScript, GitHub, or public documentation. Configure them before redeploying; [Pages secrets](https://developers.cloudflare.com/pages/functions/bindings/) become available to Functions through the environment.

**Complete all required settings. Setting the visitor code alone does not activate access:** the current backend also requires D1, R2, email, Turnstile, owner login, and the rate-limit salt. `REPLY_TO` has a Gmail fallback, but keep the explicit setting for clarity.

Check the local configuration:

```sh
npm run config:check
```

This checks structure and leftover placeholders, not account permissions, secret validity, or delivery. Commit the completed nonsecret `wrangler.toml` to the private repository after reviewing it.

## 6. Upload the private case studies and originals

The full owner package contains all **22 downloadable files** in `private/originals/`, totaling **819.7 MB**. These include the original proposals, onboarding PowerPoints, data-dive deck, coaching plan, book one-sheet, 118-page dissertation, and Future Public School’s Year 2 curriculum strategy and Year 1 fall update for families. Four PDFs package the supplied curriculum images, de-identified movement profile, five unique playground views, and three facility photos without cropping or recompression. The 6:39 MTSS introduction is the exact video extracted from the supplied data-dive deck. The eight-page Summer Institute agenda removes only the historical guest Wi-Fi password value. See [ASSETS-NEEDED.md](ASSETS-NEEDED.md) for the complete file list and `private/source-files.json` for provenance and hashes.

The LMS case connects three unchanged MP4s into one guided experience: **HBU orientation → Athletic Stance microcredential lesson → March 2019 webinar on Developmental Sequencing of Fundamental Sport Skills**. The webinar remains in its canonical webinar case and is referenced by the learning sequence; it is uploaded and counted once.

Keep this complete owner copy for uploads; the large file total preserves complete videos and original PowerPoint media. All 13 original JPGs, including the duplicate playground view, are retained in `private/source-images/`. The unmodified agenda is archived in `private/source-documents/summer-institute-agenda-original.pdf`.

The 8.87-second skateboarding MP4 is a high-quality lossy H.264 transcode in 1080×1920 portrait orientation, with the original AAC audio copied without re-encoding. Its unchanged MOV is retained in `private/source-videos/skateboarding-original.mov`. All source archives stay outside Git and runtime R2 uploads.

Run from that complete package, not a Git clone that excludes `private/`:

```sh
npm run assets:check
npm run assets:upload
```

For a differently named R2 bucket:

```sh
npm run assets:upload -- --bucket YOUR-BUCKET-NAME
```

The helper uploads the 22 enabled local files as `files/<filename>`, then uploads `private/case-studies.json` as **`case-studies.json`**. It stops if an upload fails, so the case manifest is not advanced first. It does not enable bucket sharing. Uploads use Wrangler’s [R2 object commands](https://developers.cloudflare.com/workers/wrangler/commands/r2/).

Meaningful Movement Progressions is the one hosted YouTube sample. Its link metadata is recorded in `private/hosted-videos.json` and included in the private runtime case-study data. The API checks authorization before redirecting to a strictly validated YouTube URL. The video itself is not uploaded to R2, and YouTube’s own privacy settings remain unchanged. The helper does not separately upload the hosted-video metadata file or any source archive.

`private/asset-manifest.json` is the owner checklist; it is not the runtime case-study object. Only the Movement program update video stays request-only; its expected key is listed in [ASSETS-NEEDED.md](ASSETS-NEEDED.md). Do not enable a sample without its real file or configured hosted source.

To add sample files later, use the exact keys in the checklist and place the download copies in `private/originals/`, then run:

```sh
npm run assets:sync
npm run assets:check
npm run assets:upload
```

For downloads, synchronization derives availability from the local originals folder. Retain all previously included originals there; a missing local file becomes unavailable after synchronization, even if an older object remains in R2. Hosted-video entries are validated separately and do not require a local MP4. The check command reports downloads, hosted videos, and request-only samples separately.

## 7. Deploy and test the real workflow

With Git integration, push the reviewed public/source/configuration changes to `main`. Pages deploys the repository’s `public/` output and root `functions/` directory. Keep `public/_routes.json`, which routes `/api/*` to Functions.

You can also deploy the completed local package to the same Git-integrated project:

```sh
npm run check
npm test
npm run config:check
npm run deploy
```

The deploy script targets project `peter-verdin`, branch `main`. If your project name differs, use:

```sh
npx wrangler pages deploy public --project-name YOUR-PROJECT-NAME --branch main
```

Run deployment commands from the project root so Wrangler includes `functions/`. Only `public/` is uploaded as static output. Dashboard drag-and-drop does not compile this package’s Functions directory. See [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) and [Wrangler Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/).

Inline video playback uses the explicit route `/api/asset/<key>?play=1`. Authorization applies to playback and byte-range requests used for seeking. Normal asset links remain attachment downloads by default.

On the actual HTTPS review hostname:

1. Confirm the story, Work & Experience, public résumé details, project previews, contact links, and mobile/keyboard controls work.
2. Check `/api/config`: `ready` and `passwordEnabled` should be `true`. These flags confirm configuration presence, not successful connections.
3. In an incognito window, confirm `/api/projects`, `/api/asset/nnu-proposal.pdf`, the inline player route `/api/asset/hbu-introduction.mp4?play=1`, and the hosted-video route `/api/asset/movement-progressions.mp4` reject unauthenticated access.
4. Enter the visitor code, complete Turnstile, and open all 15 case studies. Download and open all 22 local files, including the 6:39 MTSS introduction and 8.87-second skateboarding clip. Play the guided HBU orientation → Athletic Stance → March 2019 webinar sequence and seek within all three videos. Confirm regular Download links still download the files, the Meaningful Movement Progressions link redirects after authorization, and only the Movement program update video shows a request link.
5. Log out. Submit an access request using an inbox you control. Confirm it appears in `/admin/` and the notification arrives at the configured Gmail inbox.
6. Sign in at `/admin/` with the separate owner password, approve the request, and confirm the real approval email links to the review hostname. Check spam folders if necessary.
7. Redeem the email link once and confirm replay fails. Verify an approved visitor can request a fresh sign-in link.
8. Revoke that individual and confirm their browser loses access on its next private request. Individual revocation does not revoke a separately shared code; rotating `PORTFOLIO_PASSWORD` invalidates code sessions.

Do not infer delivery from local tests: the tests mock Resend and Turnstile. Live verification includes sending the expected test messages to the inboxes you choose.

### If something fails

| Symptom | Check |
|---|---|
| “Access is not connected” | Both bindings, every required setting, owner-password length/separation, and deployment after setting secrets. |
| Turnstile fails | Actual hostname, matching site/secret keys, expected action, and a fresh token. |
| Request saved but notification failed | Resend API key and verified sender; inspect `/admin/` before submitting again. |
| Private cases are unavailable | `case-studies.json` exists in the bound private bucket. |
| A supplied download is unavailable | Correct `files/` key, availability flag, completed upload, and current authorization. |
| `/api/` returns static HTML | Functions were compiled from the project root and `_routes.json` was included. |

## 8. Alternative: deploy the local ZIP without GitHub

Extract the ZIP and complete section 1. Authenticate and create a **Direct Upload** Pages project:

```sh
npx wrangler login
npx wrangler pages project create peter-verdin --production-branch main
```

Then complete sections 3–6. Use the actual assigned hostname in `SITE_ORIGIN` and Turnstile, and deploy with section 7’s Wrangler command. No repository is required.

Choose this route intentionally: Cloudflare says a Direct Upload project cannot later convert in place to Git integration. A new Git-integrated project would be needed. A project created with Git integration can still receive Wrangler deployments. [Official distinction](https://developers.cloudflare.com/pages/get-started/direct-upload/).

### Local API development

For local work, copy `.dev.vars.example` to `.dev.vars`, use local values, initialize local D1, and run:

```sh
npx wrangler d1 execute DB --local --file schema.sql
npm run dev
```

The script enables HTTPS for the Secure session cookies. D1 and R2 are local simulations by default; the upload helper deliberately uses `--remote`, so it does not populate local R2. Do not expect local private downloads without separately loading local objects. Resend and Turnstile still need suitable configuration for a real interactive local flow; `npm test` provides the mocked API checks. [Pages local development](https://developers.cloudflare.com/pages/functions/local-development/).

## 9. Final step: connect peterverdin.com

Do this only after the `pages.dev` website, access workflow, email delivery, and supplied files pass review.

1. Record the current Wix/domain configuration and copy the existing DNS records, including any MX, SPF, DKIM, and other TXT records used for email.
2. Add `peterverdin.com` to the appropriate Cloudflare account as a zone and review the imported DNS records. An apex Pages domain requires Cloudflare nameservers on the same account as the Pages project.
3. In the Pages project, use **Custom domains → Set up a domain** and follow the domain/DNS instructions. Do not merely add a CNAME pointing at Pages without associating the hostname with the project.
4. If DNSSEC is active, follow Cloudflare’s nameserver-migration instructions before replacing nameservers. Change nameservers only at this final cutover; preserve the recorded Wix settings for rollback.
5. If Wix is the registrar, its current instructions allow custom nameservers without a registration transfer, but require unassigning the domain from the Wix site before the switch. Follow that step only when ready to move the website.
6. Change `SITE_ORIGIN` to `https://peterverdin.com`, allow the final hostname in Turnstile, and redeploy. Configure `www.peterverdin.com` as an additional domain or redirect it to the chosen canonical hostname.
7. Verify HTTPS, both hostname variants, access emails, downloads, and the original URL paths, including `/resume`, `/my-work`, `/teaching-philosophy`, and `/contact`. Add any further verified legacy aliases to `public/_redirects`.

Keep Wix hosting until the new domain is serving correctly and the final checks pass. Domain registration and renewal remain separate from hosting. Cloudflare’s setup covers [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) and [nameservers/DNSSEC](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/); Wix documents [custom nameservers](https://support.wix.com/en/article/changing-nameserver-ns-records-for-a-wix-domain).

## Official references

Documentation verified October 28, 2026:

- [Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Pages build image and Node version](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Pages resource bindings and secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/)
- [Wrangler Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/)
- [D1 commands](https://developers.cloudflare.com/workers/wrangler/commands/d1/)
- [R2 commands](https://developers.cloudflare.com/workers/wrangler/commands/r2/)
- [R2 public-access behavior](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction)
- [Resend email API](https://resend.com/docs/api-reference/emails/send-email)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare nameserver setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Wix custom nameservers](https://support.wix.com/en/article/changing-nameserver-ns-records-for-a-wix-domain)
