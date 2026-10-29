# IMPORTANT — updated access fix and larger-font launch (Oct 29, 2026)

**Current website: workers.dev.** The last deployment lacked the API router and returned 404 at `/api/config`. This release supports both Pages and Workers. Before updating GitHub, read [ACCESS-SETUP-CHECK.md](ACCESS-SETUP-CHECK.md) and decide whether to keep the Workers URL (recommended if it is already configured) or move to Pages. Do **not** transfer the domain yet.

The public résumé button now opens **your uploaded five-page PDF**. That PDF is intentionally PUBLIC. It contains the original contact details and professional references; inspect it before launch.

To keep your existing `workers.dev` address, use `worker/index.js`, `wrangler.worker.example.toml` copied to `wrangler.worker.toml` with real non-secret settings, and the Cloudflare secret/binding setup in ACCESS-SETUP-CHECK.md. Simply updating CSS or uploading the `/public` folder does not install the API.

# Start here: Peter Verdin’s Cloudflare build

**For GitHub:** Extract `Peter-Verdin-GitHub-Ready.zip` and upload its contents, not the ZIP. Put `package.json`, `public/`, and `functions/` at the repository root.

**For local setup:** Extract `Peter-Verdin-Cloudflare-Build.zip` and `Peter-Verdin-Learning-Videos.zip`. Copy the companion’s three original MP4s—`hbu-introduction.mp4`, `athletic-stance.mp4`, and `healthy-body-webinar.mp4`—into the owner build’s `private/originals/`. The main 19 files plus these three provide all 22 downloads for R2. Keep both owner archives out of GitHub.

**This is the complete deployment package. It has not been launched. Keep Wix, the domain, and nameservers unchanged while you review and set up the Cloudflare version.**

## 1. Review the approved design

Open `owner-review/Peter-Verdin-Preview.html` locally. This owner preview includes private case-study text and simulated access interactions. It is for reviewing the design; never upload it to the website or GitHub.

The deployable website is in `public/`. Its real access workflow is in `functions/`. Full case studies and work samples are delivered through the API after authorization.

## 2. Check the package locally

Install Node.js 24 or newer, open a terminal in the assembled owner folder, and run:

```sh
npm ci
npm run check
npm test
npm run assets:check
```

The package pins Wrangler 4.155.0. The asset check should report **15 case studies, 22 included downloads, 1 hosted video, and 1 request-only sample**: 24 unique sample entries in total. Only the Movement program update video remains outstanding. The complete owner copy contains all 22 downloadable files, totaling 819.7 MB, including full videos and original PowerPoint media. See [ASSETS-NEEDED.md](ASSETS-NEEDED.md) for the updated inventory and archived originals.

## 3. Create a private GitHub repository and connect Pages

Use the GitHub-ready ZIP’s extracted contents; [DEPLOYMENT.md](DEPLOYMENT.md) lists its repository files. Keep `private/`, `owner-review/`, local secrets, and `node_modules/` out of GitHub. **Do not upload either owner ZIP or drag the owner build folder through GitHub’s web uploader; it does not apply `.gitignore` for you.** Retain the assembled owner folder for private-asset uploads.

Connect the repository to **Cloudflare Pages**, with:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework | None |
| Build command | `npm run check` |
| Build output | `public` |
| Build variable | `NODE_VERSION=24` |

Use the resulting `pages.dev` address for review. [Cloudflare’s Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/) explains this connection.

**Choose Pages when creating the Cloudflare application.** This package’s `functions/` directory is compiled by Pages. Uploading only `public/` to a Worker can display the design while leaving the access service unavailable. A `workers.dev` deployment needs an explicit Worker entry-point adaptation, which this Pages package does not include. You can connect the same GitHub repository to a new Pages project; no redesign or new repository is required.

After the first deployment, open `/api/config` on its `pages.dev` address. It must return JSON with `ready`, `turnstileSiteKey`, and `passwordEnabled`. A 404 or an HTML page means the API was not deployed or routed correctly. A JSON response with `ready: false` means the API is present and the account settings in the next section still need attention. Neither result is an incorrect-code response; keep the existing visitor code.

## 4. Connect the access services

Follow [DEPLOYMENT.md](DEPLOYMENT.md) to create D1 and private R2, fill `wrangler.toml`, configure Resend and Turnstile, set the five secrets, and upload the private files with `npm run assets:upload`.

The existing visitor access code is recorded in **`private/LAUNCH-SETTINGS.md`**. Enter it as the `PORTFOLIO_PASSWORD` secret. Create a separate owner password of 20–200 characters. Never paste either into public files or GitHub.

Contact links, owner notifications, and replies use **goldinthecracksofficial@gmail.com**. Resend’s sending address must use a verified domain you own; it cannot be that Gmail address.

Configure every required setting before testing access. The shared code alone does not activate the backend. Until setup is complete, the production website reports that access is not connected.

## 5. Test before connecting the domain

Test code entry, a real access request, owner approval, email delivery, sign-in, revocation, all 22 downloads, and the authorized hosted-video link on the actual `pages.dev` hostname. Play and seek through the guided **HBU orientation → Athletic Stance lesson → March 2019 webinar** sequence. Set `SITE_ORIGIN` and Turnstile for that hostname first. Hosted-video details stay in `private/hosted-videos.json`; the portfolio gate does not change YouTube’s own sharing settings.

Only after that review, follow the final domain-cutover section in [DEPLOYMENT.md](DEPLOYMENT.md). The guide also includes a Wrangler deployment alternative if you prefer to deploy this local folder without GitHub.


## v2.7 navigation + private assets

The work gallery now opens complete case studies directly after authorization and displays sample previews beside each private case. `case-studies.json` is **not** in GitHub for privacy; upload it separately to R2 bucket `peter-verdin-private` at the root object key `case-studies.json`. Each asset's exact key is `files/<asset-key>`. If an asset is missing, the website checks before opening it and shows a request message instead of raw JSON. See the separate R2 upload guide.

## Update v2.8 — easier navigation and role tracking (October 29, 2026)

- All 15 projects show their title **above** the visual. The title, visual and **Open case study** button all lead directly to the case after access is granted (or open the code-first access dialog before login).
- Full case-study cards display the narrative on the left and previews/files on the right on desktop (stacked on phones). Missing files get an on-page request message instead of a raw 404 JSON tab.
- The résumé keeps an expandable set of complete bullets per job. Its sticky role navigation lists **all 11 roles** and automatically highlights the role being read as you scroll; on narrow screens, it scrolls the role strip horizontally without moving the page.
- Increased small typographic labels on the site. The print/download résumé link uses `public/assets/dr-peter-verdin-resume.pdf`.

**Important R2 step:** The private case narratives are stored separately, not in this GitHub upload. Upload the accompanying `case-studies.json` at the ROOT of R2 bucket `peter-verdin-private`, with exact object name `case-studies.json`; work sample files are under the `files/` prefix. The separate R2 upload instructions describe the structure. Never place the private case-study index or original files in `public/` or GitHub.

**Existing Cloudflare configuration:** Keep your current root `wrangler.toml` in GitHub. The GitHub ZIP contains `wrangler.worker.example.toml` as an example, not a replacement for your configured file. Keep existing runtime secrets (`PORTFOLIO_PASSWORD`, `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_SALT`) in Cloudflare, not in GitHub. This source update does not change their values or any D1/R2 bindings.
