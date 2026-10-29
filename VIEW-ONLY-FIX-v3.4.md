# v3.4 — PowerPoint files now open view-only slides

This release includes the full v3.1 viewer/backend migration, **even in the small changed-files ZIP**, plus the refined v3.3 personal graphics.

## Deployment

1. Confirm the 274 `.webp` previews and 17 `.json` manifests from the previously supplied v3.1 R2 preview archive are already in `peter-verdin-private/previews/`. For instance, `previews/onboarding-k6.pptx.json` and `previews/onboarding-k6.pptx--0001.webp`.
2. Upload the *contents* of the v3.4 changed-files ZIP into the `pverdin7/peterverdin` GitHub repository with the same paths. **Pay special attention to `functions/api/[[path]].js`, `worker/index.js`, `public/sample/index.html`, and `public/assets/sample.js`**; these must be deployed together. The configured `wrangler.toml` remains untouched.
3. Commit to `main`, wait for the Cloudflare deployment to complete, then hard-refresh `/my-work/`.
4. After logging in, click `K–6 onboarding lesson` or `Grades 8–12 clickable onboarding guide`. The link opens `/sample/?file=onboarding-k6.pptx` or `/sample/?file=onboarding-812.pptx` with next/previous slide controls.
5. An old link to `/api/asset/onboarding-k6.pptx` now redirects to the private on-screen viewer instead of returning the PPTX. The original source file is never transmitted.

Do not upload these website ZIPs into R2. Do not upload view-only previews into GitHub. Password and Turnstile secrets stay in Cloudflare, as does the private R2 storage. The public résumé remains intentionally downloadable.

Watermarked slide images remain screenshot-able; full prevention of capture is impossible on standard browsers. Slide animations, embedded links, and clickable interactions are not retained in image previews.
