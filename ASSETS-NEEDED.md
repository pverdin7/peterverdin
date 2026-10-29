# Work-sample inventory

**Assemble the owner files first:** Extract `Peter-Verdin-Cloudflare-Build.zip` and `Peter-Verdin-Learning-Videos.zip`. Copy the companion’s three supplied original videos—`hbu-introduction.mp4`, `athletic-stance.mp4`, and `healthy-body-webinar.mp4`—into the main build’s `private/originals/`. The main 19 downloads plus these three provide all 22 files. Keep both owner archives out of GitHub; the separate GitHub-ready ZIP contains only repository files.

The full package contains **15 approved case studies and 24 unique sample entries: 22 downloadable files, 1 hosted video, and 1 request-only video**. The complete owner copy contains every included local file under `private/originals/`. Only the Movement program update video still uses a **Request this sample** email link after access is granted.

Full case studies, inline video playback, downloads, and the hosted-video redirect are accessed through the authorization API after the Cloudflare resources are configured. Public project previews remain public. No account, deployment, or DNS changes were made when adding these samples.

## Included downloads

| Private filename | Included sample | Source treatment |
|---|---|---|
| `nnu-proposal.pdf` | NNU Enrollment Campaign Proposal, readable PDF (14 pages) | Existing original; bytes unchanged |
| `slow-by-slow.pdf` | Slow by Slow Boise to Nampa Research Presentation (16 pages) | Existing original; bytes unchanged |
| `live-nation-tso.pdf` | Live Nation / TSO pitch deck (23 pages) | Supplied PDF; bytes unchanged |
| `for-a-reason-proposal.pptx` | Terry Reilly — For a Reason proposal (14 slides) | Supplied PowerPoint; bytes unchanged; fourth client-strategy sample |
| `author-one-sheet.pdf` | Gold in the Cracks book one-sheet (1 page) | Existing original; bytes unchanged |
| `onboarding-k6.pptx` | K–6 onboarding lesson (23 slides) | Supplied PowerPoint with embedded media preserved |
| `onboarding-812.pptx` | Grades 8–12 clickable onboarding guide (9 slides) | Supplied PowerPoint with embedded media preserved |
| `mtss-data-dive.pptx` | Jerome district data dive — ELA/math gap analysis (27 slides) | Supplied PowerPoint; bytes unchanged |
| `mtss-introduction.mp4` | MTSS data-dive introduction (6:39) | Exact embedded video bytes extracted from the supplied data-dive deck |
| `evsd-coaching-plan.pdf` | EVSD coaching plan, 2023–24 (4 pages) | Supplied PDF; bytes unchanged |
| `dissertation.pdf` | Doctoral dissertation (118 pages) | Supplied PDF; bytes unchanged |
| `movement-year2-strategy.pdf` | Future Public School — Year 2 curriculum strategy and program plan (5 pages) | Supplied PDF; bytes unchanged; part of the overall curriculum case |
| `movement-year1-fall-update.pdf` | Future Public School — Year 1 fall update for families (2 pages) | Supplied PDF; bytes unchanged; part of the overall curriculum case |
| `skateboarding.mp4` | After-school skateboarding video (8.87 seconds) | High-quality lossy H.264 transcode retaining portrait orientation; original AAC audio copied; unchanged MOV archived |
| `curriculum-samples.pdf` | Athlos sample lesson plans (3 pages) | PDF pages contain the three original JPEG streams without cropping or recompression |
| `hbu-introduction.mp4` | Start here: Healthy Body University orientation (2:28) | Original uploaded MP4; bytes unchanged; guided step 1 |
| `athletic-stance.mp4` | Inside a microcredential: Athletic Stance (2:20) | Original uploaded MP4; bytes unchanged; guided step 2 |
| `healthy-body-webinar.mp4` | Healthy Body Webinar — Developmental Sequencing of Fundamental Sport Skills (March 2019; 51:20) | Original uploaded MP4; bytes unchanged; guided step 3; canonical sample in project 11 |
| `tableau-deidentified.pdf` | Athletic Movement Profile — de-identified example (1 page) | PDF contains the supplied movement-profile JPEG without cropping or recompression |
| `facility-gallery.pdf` | Training facility photo gallery (3 photos, 3 pages) | Original JPEG streams embedded without cropping or recompression |
| `summer-institute-agenda.pdf` | Summer Institute agenda — 2019 (8 pages) | Website copy removes only the historical guest Wi-Fi password value; unmodified original archived separately |
| `playground-design.pdf` | Playground design renderings — five unique views (5 pages) | Original JPEG streams embedded without cropping or recompression; duplicate sixth upload retained in the owner archive |

The 22 downloadable files total **819,729,923 bytes (819.7 MB)**. This total uses only available, non-hosted entries in `private/asset-manifest.json`. The large file total includes complete supplied videos and the original onboarding PowerPoints with embedded media. Those embedded videos and the extracted MTSS introduction remain unchanged.

All 13 source JPGs are retained in `private/source-images/`: the four earlier curriculum/profile images, all six playground uploads, and three facility photos. Playground uploads 1 and 6 are identical, so the website gallery contains five unique views while the archive keeps both supplied copies.

The agenda’s website copy is 656,318 bytes. Its unmodified 945,721-byte original is preserved at `private/source-documents/summer-institute-agenda-original.pdf`. Only the historical guest Wi-Fi password value was removed from the website copy; the surrounding text and design remain.

The skateboarding download is a 12,966,244-byte MP4: 8.87 seconds, 1080×1920 portrait, and 30 fps. Its H.264 video uses a high-quality lossy CRF 18 transcode; the original AAC audio is copied without re-encoding. The unchanged 9,172,577-byte MOV is preserved at `private/source-videos/skateboarding-original.mov`. The source-image, source-document, and source-video archives are excluded from Git and runtime R2 uploads.

The book one-sheet remains the existing book sample. Original source files retain their historical design, wording, and contact details; the website uses goldinthecracksofficial@gmail.com throughout. File provenance, source filenames, and SHA-256 hashes are recorded in `private/source-files.json`.

## Guided LMS experience

Project 10 provides a sequence visitors can explore in place: begin with the **HBU orientation (2:28)**, step into the **Athletic Stance lesson within a microcredential (2:20)**, then choose the deeper **March 2019 webinar on developmental sequencing of fundamental sport skills (51:20)**. The webinar remains a single canonical sample in project 11; the learning path references that same protected file without creating another inventory entry.

All three MP4s are retained byte-for-byte, with no transcoding or remuxing. After authorization, visitors can play and seek inline or download the originals. Player stills come from the supplied videos and are included only in the private case-study data. Playback is opt-in; ordinary asset links remain downloads.

## Included hosted video

**Meaningful Movement Progressions** is connected as a hosted YouTube sample in project 11, “Make the screen a learning space.” Its link metadata is recorded in `private/hosted-videos.json` and in the private runtime case-study data. The actual URL stays out of these repository documents.

The portfolio API checks the visitor’s authorization, validates the destination against the allowed YouTube URL format, and then redirects. YouTube’s own sharing settings remain unchanged: access through the portfolio does not make a public or unlisted source video private. The upload helper includes the link in the private case-study JSON; it does not download or upload the hosted video to R2.

## Remaining video

Only the **Movement program update video** remains outstanding. Neither supplied Future Public School curriculum PDF contains a video URL, so this sample remains request-only until its source is provided.

| Project | Sample | Save under `private/originals/` as |
|---|---|---|
| 07 — Design for a lifetime of movement. | Movement program update video | `movement-program.mp4` |

## Add or replace a sample later

1. Put the download copy into `private/originals/` using its listed filename. Do not put it in `public/`.
2. Run `npm run assets:sync` to update download availability from the files actually present and validate hosted-video metadata. Keep the previously included originals in the folder.
3. Run `npm run assets:check`. It reports downloadable files, hosted videos, and request-only entries separately.
4. Run `npm run assets:upload -- --bucket peter-verdin-private` after Cloudflare authentication and bucket setup. This uploads available local files first, then the case-study JSON. A failed file upload stops before the manifest is advanced. Hosted videos stay with their provider, and all source archives are excluded from R2 uploads.

`private/asset-manifest.json` is the human inventory. `private/case-studies.json` is the runtime object that the API reads. Keep the private R2 bucket's public access disabled.

The remaining video slot expects `movement-program.mp4`. The existing Meaningful Movement Progressions sample is already configured as hosted video and does not require a local MP4.
