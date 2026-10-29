# v3.0 protected sample opening fix

Problem: The old client immediately opened `about:blank`, ran a HEAD check, then closed the tab if a protected file was missing or the session expired. PDFs were forced to download even when the interface said "Open".

Fix: File buttons now open `/sample/?file=<key>` directly (no temporary popup). The new sample page checks session and R2 availability, shows clear error/re-request options, and opens PDFs/images/videos inline after successful check. Presentations show a clearly labeled download action. The Worker now accepts `?view=1` to inline ONLY PDF/JPG/PNG/WEBP. All other file requests remain download-only, access-controlled, and no-store.

GitHub: Upload the changed files, preserving the existing `wrangler.toml` and all runtime secrets. You do not need a new R2 index for this fix.

Critical separate step: The `case-studies.json` file **is only the index**, not the originals. An entry `available: true` does not guarantee its original is uploaded. In R2 `peter-verdin-private`, each referenced original needs the key `files/<asset.key>`. Example: `files/nnu-proposal.pdf`. If a requested file does not exist under `files/` it cannot open until you upload that actual file. Do NOT put originals in GitHub or a public R2 bucket.

Test in Cloudflare: After deployment, sign in at `/my-work/`, open a PDF, a PowerPoint, a video, and a missing sample. PDF should display in the new tab; PPTX should show a Download button; video should play; missing files should show an explanation and request link, not a closing tab or raw JSON.
