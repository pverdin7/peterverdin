# v3.2 — Personal graphics + readability

**No backend changes. No secrets, R2 files, Worker entrypoint, or Wrangler changes.**

- Removed the same arch SVG that was copied **35 times** into the Work & Experience **By role** view.
- Updated both `/my-work/` and `/resume/` so neither view has the old shape.
- Added 12 coordinated squiggles, starbursts, cut-paper blobs, angled strokes, and scribbles to role metrics.
- Replaced repeated arch-like gallery motifs with wavy strokes, bold bursts, and asymmetrical shapes.
- Made résumé micro-labels, navigation and related-work links more readable.
- Busted the site stylesheet and script cache so Chrome/Cloudflare won't keep serving the old graphics.

## Deploy

For the existing GitHub Worker, use the **changed-files-only** ZIP. Copy its contents to the same paths in the repository and commit to `main`. Keep the current `wrangler.toml` intact. Do **not** upload private files or change Cloudflare settings.

If using the **complete** ZIP instead, it preserves the exact already configured `wrangler.toml` from v3.1.

After deployment, reload `/my-work/`, switch to **By role**, and inspect several roles (e.g. Varsity Tutors, HMH, Athlos). The 35 repeated arches should be gone. Test the By project view too.

Automated site and backend tests passed; the browser visual preview was not available in this runtime and should be verified on the live site after deployment.
