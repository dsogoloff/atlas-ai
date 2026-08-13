# Self-hosted webfonts

These files exist so the **production build has no network dependency**.

Previously `src/app/layout.tsx` used `next/font/google`, which downloads every
weight from `fonts.gstatic.com` *at build time*. On 2026-08-13 Google returned
**HTTP 404** for the Plus Jakarta Sans static-instance URLs Next.js had resolved,
Turbopack could not resolve the font modules, and `pnpm run build` exited 1 —
taking down the production deploy of a commit whose only change was three
markdown files. Nothing in the repo had changed; a third party had.

A build that can be broken by someone else's CDN is not a build we control. The
fonts are now committed and loaded with `next/font/local`.

## What these are

Latin-subset **variable** woff2, downloaded from Google Fonts on 2026-08-13.
Variable files cover the whole weight range in one file, so five files replace
the ~21 static instances the previous setup fetched — 185 KB total.

| File | Family | Axis range | Style |
|---|---|---|---|
| `plus-jakarta-sans-latin.woff2` | Plus Jakarta Sans | 400–800 | normal |
| `inter-latin.woff2` | Inter | 400–600 | normal |
| `dm-sans-latin.woff2` | DM Sans | 300–700 | normal |
| `playfair-display-latin.woff2` | Playfair Display | 400–700 | normal |
| `playfair-display-italic-latin.woff2` | Playfair Display | 400–700 | italic |

Ranges match the weights the previous `next/font/google` config requested, so
rendering is unchanged. Subset is `latin`, also matching the previous config.

## Licensing

All four families are under the **SIL Open Font License 1.1**, which permits
self-hosting and redistribution provided the license travels with the fonts. The
full texts are alongside the woff2 files:

- `OFL-plusjakartasans.txt` — Copyright 2020 The Plus Jakarta Sans Project Authors
- `OFL-inter.txt` — Copyright 2020 The Inter Project Authors
- `OFL-dmsans.txt` — Copyright 2014 The DM Sans Project Authors
- `OFL-playfairdisplay.txt` — Copyright 2017 The Playfair Display Project Authors,
  with Reserved Font Name "Playfair Display"

Do not rename the font files to include a Reserved Font Name variant.

## Updating a font

Re-download the latin variable woff2 from the Google Fonts CSS2 API with a
modern browser User-Agent (an old UA gets you TTF), replace the file, and keep
the axis range in `layout.tsx` in sync. Do not reintroduce `next/font/google` —
that is the thing this directory exists to avoid.

## Still fetched at runtime (deliberately not changed here)

`layout.tsx` also links `fonts.googleapis.com` for **Material Symbols Outlined**
(the icon font). That is a *runtime* stylesheet link, not a build-time fetch, so
it cannot fail a build — a Google outage degrades icons on an already-deployed
site rather than blocking a deploy. Self-hosting it is a separate, larger change
(the icon font is an order of magnitude bigger than these text fonts) and was
left out of scope.
