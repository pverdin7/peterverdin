# v3.1 — Private work samples are view-only

**Upload R2 previews FIRST. Only then deploy the changed GitHub files.**

## Step 1. Upload the preview pages to Cloudflare R2

1. Download `Peter-Verdin-R2-View-Only-Previews-v3.1.zip` and unzip it on your computer.
2. In Cloudflare, open **R2 Object Storage → peter-verdin-private**. Leave **Public Access: Disabled**.
3. At the bucket root, create/open a folder named **`previews`** (lowercase, plural). Do not open `files`.
4. In the extracted ZIP, open the `previews` folder. Select **all 291 objects** inside (274 `.webp` pages and 17 `.json` manifests), and upload those individual objects into the R2 `previews` folder. **Do not upload the ZIP itself.** The paths must remain flat inside `previews`.
5. Check you can see `previews/nnu-proposal.pdf.json`, `previews/nnu-proposal.pdf--0001.webp`, `previews/onboarding-k6.pptx.json`, and `previews/dissertation.pdf--0118.webp`.
6. Keep all existing objects in `files/` and the existing `case-studies.json` at the bucket root. No deletions are needed.

If the dashboard struggles with selecting 291 files, upload smaller groups into the same `previews` folder, preserving every filename. A `wrangler r2 object put` bulk script is another option, but the dashboard is fine.

## Step 2. Deploy the v3.1 GitHub changed-files ZIP

1. Download/extract `Peter-Verdin-Changed-Files-v3.1.zip`.
2. Copy its files into your existing `pverdin7/peterverdin` repository, preserving directory paths.
3. Commit to `main` and let the connected Cloudflare Worker deploy.
4. Keep the existing `wrangler.toml`, D1 database, R2 bucket, all Cloudflare secrets, and password unchanged.

Alternatively, the complete `Peter-Verdin-GitHub-Ready-v3.1-configured.zip` contains the same code and your exact production Wrangler config (do not upload the private R2 preview ZIP to GitHub).

## Step 3. Test

- Sign in normally with your existing code.
- Open **NNU Proposal** (PDF), **K–6 Onboarding** (PowerPoint), and **Dissertation** (118 pages).
- Use the Previous, Next, and Page controls. The original PDFs and PowerPoints are no longer transferred to visitors.
- Open the Healthy Body / Athletic Stance video. It should play on the page, without a displayed download control.
- Attempt an old direct document link like `/api/asset/nnu-proposal.pdf?view=1` while signed in: it should return a **403 view-only** error instead of the document.

## Important limitations

- This is **view-only for normal visitors, not DRM**. Someone may still take screenshots, screen-record, save a preview image, or capture an authorized video stream. Low-resolution watermarked page previews make the original PDF and PPTX much harder to retrieve from the site.
- Videos are still streamed from private R2 to a browser, so they **cannot be made technically non-saveable** with HTML controls alone. For strict video DRM, a DRM streaming service would be required.
- PowerPoint animations, embedded media, and clickable links do not function in page-image previews. Video samples are separately playable in the portfolio.
- The public five-page résumé PDF is a separate, intentionally downloadable job-search asset. This update changes only the **protected work samples**.
- The `previews/` objects must stay private in the existing R2 bucket, not in GitHub or the `public/` directory.
