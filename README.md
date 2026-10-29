# Peter Verdin — GitHub-ready portfolio (October 29, 2026)

## What changed in this release

- Larger typography on navigation, company labels (including Varsity Tutors), role date ranges, highlights captions and other small text.
- The **Print / Download full résumé** link opens the exact provided five-page PDF at `/assets/dr-peter-verdin-resume.pdf`.
- Password-access readiness no longer depends on Resend or the separate owner login. Server-side password checks, D1-backed sessions, rate limits, Turnstile checks and private R2 content remain mandatory.
- Includes **both deployment types**: Pages Functions (`functions/`) and Workers static assets (`worker/index.js`). The previous deployment at `workers.dev` needs the Worker adapter installed for `/api/*` to respond.
- `GET /api/config` gives `ready`, `passwordReady`, `requestsReady`, `ownerReady` and non-secret `missing` setting names. A 404 means missing API deployment; it cannot be fixed by changing the access code.

**Start with `ACCESS-SETUP-CHECK.md`**, then `START-HERE.md` and `DEPLOYMENT.md`. Keep protected samples outside GitHub.

# Peter Verdin — Cloudflare portfolio build

**For GitHub:** Extract `Peter-Verdin-GitHub-Ready.zip` and upload its contents, not the ZIP. Put `package.json`, `public/`, and `functions/` at the repository root.

**For local setup:** Extract `Peter-Verdin-Cloudflare-Build.zip` and `Peter-Verdin-Learning-Videos.zip`. Copy the companion’s three original MP4s—`hbu-introduction.mp4`, `athletic-stance.mp4`, and `healthy-body-webinar.mp4`—into the owner build’s `private/originals/`. The main 19 files plus these three provide all 22 downloads for R2. Keep both owner archives out of GitHub.

This package turns the approved narrative portfolio into a deployable Cloudflare Pages website with server-authorized case studies and downloads. **It is not a live deployment.** Cloudflare resources, account secrets, email delivery, Turnstile, and the final domain still need configuration and live verification.

Begin with [START-HERE.md](START-HERE.md), then use [DEPLOYMENT.md](DEPLOYMENT.md) for the full launch sequence. The owner copy also includes `verification/BUILD-VERIFICATION.md` with the completed checks and live-test requirements. Wix can continue serving the current website throughout the separate `pages.dev` review.

## The website

The public experience preserves the approved story, prominent **The Story** and **Work & Experience** destinations, visual career evidence, expandable résumé bullets, related-work links, hover previews, brutalist graphics, and the portrait blended into the opening background. All 15 projects remain represented, including the book and Exit Door Press brand work.

Visitors can read the public story and résumé without signing in. The work-sample popup offers **access code first**, then request access. Authorized visitors receive full case studies, protected inline video playback, and available downloads from the API. The owner workspace supports reviewing requests, approving access, and revoking individual access.

Contact links, notification delivery, and reply-to configuration use **goldinthecracksofficial@gmail.com**. The transactional-email sender is configured separately with a verified domain.

## Owner build contents

| Location | Purpose |
|---|---|
| `public/` | Public HTML, CSS, JavaScript, images, redirects, and metadata; the only static output directory. |
| `functions/` | Pages Functions API for requests, sessions, approvals, authorized video playback, and downloads. |
| `schema.sql` | D1 tables and indexes. |
| `scripts/` | Build checks, configuration checks, and private-asset synchronization/upload helpers. |
| `tests/` | Local API tests using SQLite and mocked external services. |
| `private/` | Case-study JSON, asset checklist, downloads, source-image, source-document, and source-video archives, hosted-video metadata, and owner launch settings; excluded from Git. |
| `owner-review/` | Self-contained owner preview with private text and simulated interactions; excluded from Git. |
| `wrangler.example.toml` | Template for nonsecret bindings and configuration. |

The two owner ZIPs contain private material. Keep the assembled owner folder locally. The GitHub-ready ZIP contains only the repository files listed in `DEPLOYMENT.md`; upload those extracted contents to a **private GitHub repository**. The GitHub web uploader does not enforce `.gitignore`; selecting the entire owner folder would include excluded material.

## Work-sample status

The private case-study data includes **15 projects and 24 unique sample entries: 22 downloadable files, 1 hosted video, and 1 request-only video**.

The downloads include four client-strategy samples, with the Terry Reilly — For a Reason proposal alongside NNU, Slow by Slow, and Live Nation / TSO; K–6 and grades 8–12 onboarding PowerPoints; the Jerome data-dive deck and its 6:39 introduction video; the EVSD coaching plan; Athlos curriculum and movement-profile PDFs; and the book one-sheet. Also included are the 118-page dissertation, eight-page Summer Institute agenda, three-photo training facility gallery, and five-view playground gallery. See [ASSETS-NEEDED.md](ASSETS-NEEDED.md) for exact filenames and source treatment.

Future Public School’s overall curriculum case includes the five-page Year 2 strategy and two-page Year 1 fall update for families, both unchanged PDFs. The separate skateboarding project includes the supplied 8.87-second clip.

The LMS case offers one guided experience: **HBU orientation (2:28) → Athletic Stance microcredential lesson (2:20) → the March 2019 webinar on Developmental Sequencing of Fundamental Sport Skills (51:20)**. Visitors can watch inline, seek, and download each original MP4. All three videos are preserved byte-for-byte. The webinar also appears in its own case study and is counted once in the inventory.

The assembled owner copy retains all 22 download files in `private/originals/`, totaling **819.7 MB**. The large file total includes complete videos and original PowerPoint media; the main owner ZIP also retains source archives. The four image-based PDFs embed the supplied JPEGs without cropping or recompression, and the MTSS introduction preserves the exact video bytes from the supplied deck. All 13 source JPGs, including the duplicate playground view, are retained in `private/source-images/`.

The website’s agenda copy removes only the historical guest Wi-Fi password value. Its unmodified original is preserved in `private/source-documents/`, outside the runtime upload paths. The dissertation and the other supplied PDF and PowerPoint originals remain unchanged.

The skateboarding MP4 uses a high-quality lossy H.264 transcode, retaining portrait orientation and copying the original AAC audio without re-encoding. The unchanged MOV is archived in `private/source-videos/`.

Meaningful Movement Progressions uses a hosted YouTube link recorded in `private/hosted-videos.json`. The API authorizes the visitor before a strictly validated redirect; YouTube’s own sharing settings remain unchanged. The upload helper uploads the 22 local files and case-study JSON; the hosted video and all source archives are excluded from R2 uploads.

The **Movement program update video** is the only outstanding sample and offers a **Request this sample** email link. Its expected filename is recorded in [ASSETS-NEEDED.md](ASSETS-NEEDED.md) and `private/asset-manifest.json`.

The existing visitor code is recorded only in `private/LAUNCH-SETTINGS.md`; configure it as the `PORTFOLIO_PASSWORD` secret. The owner password must be different and contain 20–200 characters.

## Local commands

Run from the assembled owner folder with **Node.js 24 or newer**. `npm ci` installs the locked dependencies, including Wrangler **4.155.0**.

| Command | Purpose |
|---|---|
| `npm ci` | Install the pinned toolchain. |
| `npm run check` | Check JavaScript and public-output boundaries. |
| `npm test` | Exercise API authorization and failure behavior locally. |
| `npm run preview` | Serve static pages with Python 3; the API does not run. |
| `npm run dev` | Run Pages Functions locally over HTTPS after local configuration. |
| `npm run config:check` | Check the structure of a completed `wrangler.toml`. |
| `npm run assets:check` | Check samples and report local downloads, hosted videos, and request-only entries separately. |
| `npm run assets:sync` | Update download availability from local originals and validate hosted-video metadata. |
| `npm run assets:upload` | Upload available local files to private R2, then case-study JSON; hosted videos stay with their provider. |
| `npm run deploy` | Deploy to the configured `peter-verdin` Pages project’s `main` branch. |

## Hosting

The recommended route is **private GitHub repository → Cloudflare Pages**, using `npm run check` and output directory `public`. There is no framework compilation step. The existing Pages Functions architecture is retained; Cloudflare documents [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/) and [Git deployment](https://developers.cloudflare.com/pages/get-started/git-integration/).

Local tests use simulated email and bot checks. They do not establish that live accounts or delivery work. Complete the real access/email/download tests in `DEPLOYMENT.md` before the final domain cutover.
