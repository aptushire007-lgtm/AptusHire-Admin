# Existing LiveKit recording playback — 10 September 2026

Scope: play existing interview files in Cloudflare R2 from Recordings and AI Interview Reports. The user explicitly chose existing-file playback; future LiveKit Egress capture remains disabled.

## Findings

- The active storage service resolves Cloudinary references, while historical LiveKit MP4s remain in R2.
- Read-only inspection found nine Egress sessions marked `recording`, with an Egress ID but no `recordingKey` saved by the old webhook.
- All nine have files under `interview-recordings/<company>/<session>-<timestamp>.mp4`. Seven have one capture; two have two captures.
- The library previously opened the latest candidate report, potentially showing a different attempt from the selected recording.

## Interface direction

Retain the authenticated workspace design: forest `#0E3B2E` actions, canvas `#F5F7F6`, white `#FFFFFF` surfaces, borders `#DEE5E1`, and slate `#5B6B63` supporting text. Keep Inter for controls and Lexend for page headings. Left-align identity, attempt and availability; make the recording itself the main visual element.

```text
Recordings → candidate / attempt → recording dialog
                                 [file choice, when needed]
                                 [video + playback controls]
                                 [matching AI report]

AI report → questions | same player + transcript
```

This extends the existing review workflow without introducing a separate live-room interface for saved video. Recovery of multiple captures requires an explicit file choice, so a reviewer is never silently shown an arbitrary capture.

## Implementation

- `r2RecordingStorage.js` uses server-side S3 credentials, supports the existing `S3_*` settings plus optional `R2_*` aliases, checks file existence, and signs GET URLs for 15 minutes. MP4 and WebM files stream directly from R2 with byte-range support.
- Saved bare keys, `r2:<key>`, `s3://<configured-bucket>/<key>`, and configured S3 endpoint URLs are supported. Cloudinary recording references retain their existing playback path.
- When an Egress session has no saved key, discovery lists only its exact company/session prefix. The API returns opaque file choices, never arbitrary bucket keys. Multiple captures require a choice; every mint revalidates it against that session.
- `/interview-sessions/recordings/:sessionId` checks admin authorization and company ownership. Metadata reads issue no playback URL; explicit successful mints retain the recording-view audit event. Responses use `Cache-Control: no-store`.
- Reports include their exact `interview.sessionId`; library links include the matching attempt. Historical interview outcomes are not rewritten during file discovery or playback.
- The shared player handles failed status checks, missing files, expired URLs, link refresh, speed, inline video controls and session changes. Refresh reloads the media element and retains playback position.
- Historical Egress recordings without a measured capture clock keep native video seeking available but disable unverified transcript-to-video jumps.
- Candidate erasure routes historical recordings to R2, including discoverable captures whose keys were never saved. No erasure was performed during this work.

## Verification

- Full admin suite: 130 tests across 24 files passed before the final timestamp guard. Final focused recording/report tests: 10 passed, including the added timestamp-guard test.
- Backend recording, LiveKit, report and identity checks: 46 passed.
- Final production build: passed, 2,457 modules.
- Real R2 WebM byte-range read: HTTP 206, requested 1,024 bytes returned.
- Real interview-session recovery through the new service: matching MP4 found and signed playback returned HTTP 206.
- Live checks were read-only; no database records, bucket settings or capture configuration were changed. No deployment was performed.

Visual browser verification could not run: the browser inventory was empty, and both Chrome and the in-app browser returned “Browser is not available.” No screenshot, mobile-layout inspection or browser-decoding result is claimed.

## Operational notes

The existing local `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` settings were sufficient for the live checks. A deployed API needs these settings or their documented `R2_*` aliases, with object-read and prefix-list access. Existing erasure also requires delete access. Keep credentials server-side.

Historical database statuses remain unchanged, so recovered sessions remain under the existing Recording filter and display “Check playback” in the library. The player confirms availability when opened. This work supports file playback; HLS playlists would require separately authorized segment delivery and are reported as unsupported.

References: [LiveKit Egress formats](https://docs.livekit.io/transport/media/ingress-egress/egress/), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [R2 browser CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/).
