# v3.5 — media viewer reliability / diagnostics

This update keeps view-only document protection, adds manifest-less preview fallbacks when watermarked .webp pages exist in private R2, and mounts the video player directly rather than gating playback on a HEAD request.

**Deploy:** replace the matching files in your GitHub repository with the v3.5 changed-files ZIP. Do not change `wrangler.toml`, secrets, or case-studies.json.

**Verify:** after deployment, open `/api/config` and confirm `viewerVersion` is `3.5`. Refresh, sign in, open a PDF/PowerPoint and Healthy Body University video. If a sample fails, its viewer now reports the HTTP status and the backend response instead of a generic failure.

**R2:** document preview pages live at `previews/<filename>--0001.webp`, etc.; videos at `files/<filename>.mp4`; this update does not upload or move R2 objects. The original documents cannot be downloaded via the Worker.
