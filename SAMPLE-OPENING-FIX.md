# Sample viewer — current behavior (v3.1)

Private PDF and PPTX samples are rendered as watermarked page images under R2 `previews/`. Authorized viewers navigate pages inside `/sample/`, with no original document URL or Download button. The backend rejects original PDF/PPTX requests with HTTP 403. Private MP4 videos stream inline with the native download control suppressed (not DRM). All original files remain inside R2 `files/`, not GitHub.

See **VIEW-ONLY-SETUP-v3.1.md** for the upload-first deployment order and exact object paths. Older deployment and asset-inventory guides may refer to original-file downloads, which were disabled by v3.1.
