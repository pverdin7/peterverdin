# Viewer repair v3.6

The `/sample/` page failed even when the `/api/preview/{key}/1` endpoint worked. The page JavaScript called `getElementById("sample-stage")`, but the markup used `class="sample-stage"` without an ID. Activating the viewer therefore threw a TypeError before rendering document images or video.

## Fix
- Add `id="sample-stage"` to the existing viewer section and make the layout-class application resilient to a missing element.
- Add regression validation that every hard-coded JavaScript element ID exists in the page HTML.
- Bust the cached viewer JavaScript version.
- Report `viewerVersion: 3.6` in `/api/config`.

## Deploy
Replace matching files in GitHub and commit to `main`; do not touch Cloudflare secrets, `wrangler.toml` or the private R2 bucket. Open `/api/config` to check `viewerVersion` is `3.6`; reload a protected PDF, PowerPoint, and MP4.

The viewer restricts original PDFs and PowerPoints to page images. As with any online playback, a video or image displayed to a visitor may still be saved or recorded by sufficiently motivated users.
