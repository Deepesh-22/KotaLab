# KotaLabs — code & live-site review

**Reviewed:** `kotelabs/` on branch `arena/666ffe10-kotalab` (base `04d233a`) against the live deploy
at <https://kotalabs.vercel.app/>
**Date:** 24 Oct 2026

**Verdict:** the site is in good shape. Hand-written, no build step, no third-party requests, clear
comments, honest copy, and the three things that actually matter for a Kota small-business site
(WhatsApp, click-to-call, visible prices) are all on the page, above the fold or one tap away.
The problems I found were concentrated in **page weight** and a few **metadata / accessibility**
gaps. Four are fixed below; the rest are judgement calls for you.

---

## 1. What I checked, and how

| Area | Method | Result |
|---|---|---|
| Live site (home, work, 404) | Fetched rendered content of `/`, `/work.html`, and a made-up URL | All three render fully; unknown URLs correctly serve `404.html` |
| Broken internal links / assets | Extracted every `href`/`src`/`srcset` from all four pages and resolved each one | 0 broken — every asset, anchor (`#services`, `#pricing`, `#founders`, `#contact`, `#process`, `#manifesto`) and page exists |
| HTML structure | Tag-balance parse of all four pages | No unclosed or mismatched elements; no duplicate `id`s |
| JS syntax | `node --check` on all three files | Clean |
| JSON-LD / sitemap / vercel.json | Parsed each | Valid; `ProfessionalService` schema matches the on-page prices and phone numbers |
| CSS | Brace balance, token audit, reduced-motion audit | Balanced; `prefers-reduced-motion` handled in CSS *and* JS (3D never loads, loader skipped) |
| Colour contrast (WCAG) | Computed ratios against `--ink` | Body copy 18.4:1, `--muted` 10.4:1, `--muted-dim` 5.9:1, lime 15.8:1 — all pass. One failure found, see 2.2 |
| Phone / price consistency | Grepped every number and `wa.me` link | Consistent: 27 WhatsApp links, 8 `tel:` links, all pointing at Vansh `7898140600` / Deepesh `9462120133`; discounts really are 44% / 25% / 47% of the struck prices |
| Asset weight | Raw + gzip sizes, and image inspection | See 2.1 — this was the one real problem |

**Not checked (no browser in this sandbox):** actual paint, console output, the WebGL galaxy, and
mobile layout at 360px. There are already Playwright scripts for exactly this in `qa/`
(`regress.py`, `test_site.py`) — run them locally with `pip install playwright && playwright install chromium`
before you push to production. Everything below was verified statically or over HTTP.

---

## 2. Fixed in this branch

### 2.1 Page weight — project screenshots were ~1.9 MB of PNG (P1)

`assets/img/eduroute-preview.png` (928 KB) and `goswami-optics-preview.png` (982 KB) were full
1642/1670-px screenshots rendered into a card that is never wider than ~700 px. Together they were
**62% of the whole deploy**, and on the ₹10,000-phone-over-4G audience the copy is written for, that
is a multi-second wait for a decorative image.

Re-encoded at 1200 px wide and rewired with `<picture>`:

| File | Before | After |
|---|---|---|
| EDUROUTE | 928 KB PNG | **55 KB WebP** / 82 KB JPEG |
| Goswami Optics | 982 KB PNG | **100 KB WebP** / 121 KB JPEG |
| Whole `kotelabs/` folder | 3.1 MB | **1.5 MB** |

```html
<picture>
  <source srcset="assets/img/eduroute-preview.webp" type="image/webp">
  <img src="assets/img/eduroute-preview.jpg" alt="" width="1200" height="875" loading="lazy" decoding="async">
</picture>
```

The `width`/`height` were corrected to the real pixel size, so the reserved box still prevents
layout shift. I opened the re-encoded screenshots at 1:1 and the UI text is still crisp.
Touched: `index.html`, `work.html`, `assets/css/styles.css` (`.project-browser__viewport picture`).

### 2.2 Manifesto words were unreadable before they lit up (P1, accessibility)

`.w { opacity: 0.16 }` put the not-yet-lit words at **1.44:1** — effectively invisible on a bright
phone in daylight, which defeats the point of a scroll-driven manifesto. Raised to `0.38`
(**3.2:1**, AA for the large display type) — they still read clearly as "dim", and the lit/unlit
contrast that makes the effect work is intact. `assets/css/styles.css`.

### 2.3 `work.html` had incomplete social/link metadata (P2)

Missing `twitter:image` (so X/Twitter shows no card for the work page), plus `og:site_name`,
`og:image:alt` and the `og:image:width/height` that make first-share cards render without a
re-crawl. `index.html` got the image dimensions added too.

### 2.4 Housekeeping (P3)

- `hamburger-demo.html` was indexable — a component demo competing with your own page in search.
  Now `noindex, follow`.
- `sitemap.xml` `lastmod` was stale (2026-10-22) — bumped to today.
- `README.md` claimed a `.gitignore` was "already in place"; there wasn't one. Added
  (`.vercel/`, `.env*`, `node_modules/`, OS/editor noise, QA screenshots).
- README docs updated: new image filenames, new deploy weight, and a new §9b explaining the
  `<picture>` pattern and the exact `convert` commands to regenerate both formats.

---

## 3. Worth deciding on (not changed)

**P2 — the preloader can hold the page for 3.2 s.** `SITE.loaderMaxMs = 3200` and
`loaderMinMs = 900`. On a cheap Android over 4G that is the *whole* first impression, on a site whose
pitch is "2.4 s load". Consider `loaderMaxMs: 1600` and skipping the loader entirely when
`navigator.connection.saveData` or `effectiveType` is `2g/3g`.

**P2 — the 3D easing is frame-rate dependent.** `hero-scene.js` `draw()` advances by fixed factors
(`* 0.055`, `* 0.045`) rather than by delta time, so the scroll dispersion and cursor wake run
roughly twice as fast on a 120 Hz phone as on a 60 Hz one, and feel sluggish on a device dropping to
30 fps. Passing `clock.getDelta()` into the lerps fixes it.

**P2 — no recovery from WebGL context loss.** `webglcontextlost` is handled (render loop stops,
canvas goes quiet) but there is no `webglcontextrestored`, so the hero stays flat until a reload.
Common on Android when the tab is backgrounded under memory pressure. Either drop `canvas.remove()`
into the context-restored path, or simply hide the canvas and let `.hero__fallback` (already in the
CSS) take over visibly.

**P3 — no measurement.** There is no analytics and no Search Console verification anywhere in the
files, yet the README checklist asks for both. Without them you cannot tell whether the WhatsApp
buttons or the form produce leads. One Plausible snippet or GA4 tag before `</body>` closes that gap.

**P3 — confirm `hello@kotelabs.com` exists.** It is `mailto:`-linked in the footer of both pages. A
dead mailbox on a page that promises "replies in 2 hours" is worse than no address.

**P3 — `vercel.json` has a dead rule.** `"/(fonts|vendor)/(.*)"` matches nothing (fonts live at
`/assets/fonts/`); the `/assets/(fonts|vendor)/` rule right below it is the one that works. Also no
`Content-Security-Policy` or `Permissions-Policy` — low risk for a static site, but `Permissions-Policy:
camera=(), microphone=(), geolocation=()` is free.

**P3 — phone numbers are hand-written 35 times.** The README already warns about this. If a number
ever changes, drift is likely; the `<a data-wa>` + one small script pattern would remove the class of
bug entirely. Not worth the refactor unless you add a third person.

**Note:** the two project cards appear identically on `index.html` and `work.html`. That is fine
(different intents, both self-canonical), just be aware the work page is not a unique-content page
for SEO yet — it will be once real case studies with numbers replace the three open slots.

---

## 4. Local preview

```bash
python3 serve.py 8080 kotelabs     # threaded server, binds 0.0.0.0
# → http://localhost:8080
```

I ran this and exercised every page and asset over HTTP: all 200, all links resolve. The changes are
pushed to `arena/666ffe10-kotalab`; Vercel will need a deploy (or a merged PR) before
`kotalabs.vercel.app` shows them.
