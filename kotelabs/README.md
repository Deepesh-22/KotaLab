# KotaLabs — website

A production-ready, hand-coded marketing site for a web-design studio in Kota, Rajasthan.
No build step, no npm install, no framework. Upload the folder and it runs.

- **Pages:** `index.html` (home), `work.html` (empty-state work page), `404.html`, and `hamburger-demo.html` (interactive component demo)
- **3D:** one persistent Three.js + GLSL layer behind the *whole page* — a warm-white spiral galaxy made from tiny circular particles, with a bright core, gentle twinkle, cursor wake, and a **scroll-driven dispersion** that opens the spiral into a screen-wide dust field. Uses 32,000 particles on desktop, 15,000 on mobile, and 7,600 on low-power devices. Loaded lazily; never downloaded for reduced-motion users.
- **Type:** Geist + Geist Mono (display / labels) and Inter (body), all self-hosted
- **Animation:** counting preloader, masked line reveals, a pinned word-by-word manifesto, scroll progress bar, scroll colour grading, sticky process rail, counters, marquee, accordions, magnetic buttons, and a gradient footer wordmark with a wipe + travelling sheen — all hand-written, no GSAP / no Lenis, ~40 KB of JS total
- **Business credentials:** a responsive Udyam/iStart Rajasthan trust section appears between founders and contact; Udyam number is shown from the certificate and cards link to official portals
- **Contacts:** WhatsApp deep links (with pre-filled messages) for both founders + click-to-call + a form that opens WhatsApp with the details already written
- **Weight:** ~1.5 MB on disk, of which 671 KB is Three.js (loaded only when the scene is in view). Everything else is fonts (99 KB) + CSS (71 KB) + JS (39 KB) + images. The two project screenshots are served as WebP (~156 KB) with a JPEG fallback (~203 KB) via `<picture>`.

---

## 1. Run it locally

Any static server works:

```bash
cd kotelabs
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly by double-click mostly works too, except the 3D scene —
ES modules and the `THREE` import need `http://`, not `file://`.

## 2. Deploy

| Host | What to do |
|---|---|
| **Netlify** (easiest) | Drag the `kotelabs` folder onto app.netlify.com → done. Free SSL. |
| **Vercel** (what this folder is set up for) | Push to GitHub → vercel.com → *Add New Project* → import the repo → **Framework Preset: Other**, build command empty, output directory `.` → Deploy. `vercel.json` already sets caching + basic security headers, and Vercel picks up `404.html` automatically. |
| **GitHub Pages** | Push, then Settings → Pages → deploy from branch root. |
| **cPanel / Hostinger** | Upload the folder contents to `public_html`. |

The current site URL is `https://kotalabs.vercel.app/`. Add a custom domain only if you own one, then update the canonical and social metadata to match.

**Pushing to GitHub for the first time**

```bash
cd kotelabs
git init -b main
git add .
git commit -m "KotaLabs website"
git remote add origin https://github.com/<you>/kotelabs.git
git push -u origin main
```

`.gitignore` is already in place, so screenshots, `.vercel/`, `.env` files and editor noise stay out of the repo. Every push to `main` re-deploys on Vercel; pull requests get preview URLs.

## 3. Edit the essentials

**Phone numbers / WhatsApp** appear in a few places. Search-and-replace these two strings everywhere:

```
917898140600      →  Vansh     (91 + 7898140600)
919462120133      →  Deepesh   (91 + 9462120133)
```

- `tel:+917898140600` is the click-to-call version.
- The JS-side config (which number the contact form sends to) is at the top of `assets/js/app.js` → `SITE`.
- Every WhatsApp link already carries a pre-filled message; edit the `?text=` value to change the wording.

**Email / address / hours:** `hello@kotelabs.com`, `Kota, Rajasthan 324005`, `Mon–Sun 10:00–21:00` — in the footer of `index.html` and `work.html`.

**Prices:** in `index.html` inside the `.plans` block. Each plan shows a struck-through regular price, a % off badge and the offer price:

| Plan | Regular (struck) | Offer price | Badge |
|---|---|---|---|
| Launch | ₹8,999 | **₹4,999** | 44% off |
| Business | ₹12,000 | **₹8,999** | 25% off |
| Custom / 3D | ₹21,000 | **₹11,000** (starting) | 47% off |

Structure of one price block (copy this if you add a plan):

```html
<p class="plan__price">
  <span class="plan__was"><span class="sr-only">Regular price</span><s>₹8,999</s><span class="plan__off">44% off</span></span>
  <span class="plan__now"><span class="cur">₹</span>4,999</span>
  <small>one-time · GST extra · you save ₹4,000</small>
</p>
```

If you change a price, update three things: the `<s>` regular price, the `.plan__off` percentage, and the number inside that plan's WhatsApp link (`?text=...%E2%82%B94%2C999...` = ₹4,999).

**The offer strip** (the lime banner above the plans) and the hero pill are in `index.html` — search for `offer-strip` and `hero__offer`. The line *"Offer ends when the three slots are filled"* is the honest reason for the discount; keep it tied to something real (slots filling, or a date you actually honour).

**Colours / type:** `assets/css/styles.css` → `:root`. The accent is `--lime: #c9f24d`.
The galaxy particle palette and spiral layout are generated in `assets/js/hero-scene.js`; adjust the `colors` values and arm-generation block to tune its warmth and density. Scroll dispersion is driven by `uOpen` and the normalized `aScatter` destinations. The page's separate CSS background wash (`.grade`) still grades with scroll.

## Hamburger-to-X SVG component

The reusable, dependency-free component is demonstrated at [`hamburger-demo.html`](hamburger-demo.html). It animates the SVG path geometry with a damped spring: outer strokes briefly fold into curves, while the centre line contracts and fades. Clicks retarget from the current animation position; Enter and Space work through the native button behavior, and reduced-motion preferences snap directly to the target state.

Load `assets/css/hamburger-morph.css` and `assets/js/hamburger-morph.js`, then provide a button with the three named SVG paths:

```html
<button type="button" class="hamburger-morph" aria-label="Open menu" aria-expanded="false">
  <svg class="hamburger-morph__icon" viewBox="0 0 40 40" aria-hidden="true">
    <path class="hamburger-morph__path" data-hamburger-part="top" d="M8 11 H32" />
    <path class="hamburger-morph__path" data-hamburger-part="middle" d="M10 20 H30" />
    <path class="hamburger-morph__path" data-hamburger-part="bottom" d="M8 29 H32" />
  </svg>
</button>
<script src="assets/js/hamburger-morph.js"></script>
<script>
  const toggle = HamburgerMorph.mount(document.querySelector(".hamburger-morph"), {
    onChange: (open) => console.log("Menu open:", open),
  });
  // toggle.setExpanded(false) also reverses an in-progress animation smoothly.
</script>
```

Configure the icon with CSS custom properties: `--hamburger-icon-size`, `--hamburger-stroke-color`, and `--hamburger-stroke-width`. The controller also updates `aria-expanded` and toggles the accessible label between “Open menu” and “Close menu”.

## 4. When you get your first project

In `work.html`, each project is an `.slot` article. Replace a slot with a real case study:

```html
<article class="slot" data-reveal="scale">
  <div class="slot__top">
    <span class="slot__id">01 / RETAIL</span>
    <span class="slot__status">Live</span>
  </div>
  <div>
    <h2 class="slot__title">Sharma Sarees</h2>
    <p class="slot__meta">Problem → what we built → the result (enquiries 3× in 90 days).</p>
  </div>
  <div class="slot__foot">
    <a class="link-arrow" href="https://example.com" target="_blank" rel="noopener">Visit site</a>
    <span class="mono">2026</span>
  </div>
</article>
```

Also update the counter text `Project slots — 0 of 3 taken` and the homepage "Work" section
(`#work` in `index.html`). Rule of thumb from the reference research: **one honest case study with
numbers beats ten screenshots.**

## 5. Before you go live — small checklist

- [ ] Verify the canonical URL, Open Graph URL, `sitemap.xml` and `robots.txt` use `https://kotalabs.vercel.app/` (or your custom domain if configured).
- [ ] Create `hello@kotelabs.com` (or change the mailto).
- [ ] Add Google Analytics 4 or Plausible — one `<script>` before `</body>`.
- [ ] Claim the **Google Business Profile** for "KotaLabs, Kota" (this drives local calls more than the site does).
- [ ] Add the site to Google Search Console and submit `sitemap.xml`.
- [ ] Add your Instagram/Google Maps links to the `sameAs` array in the JSON-LD at the top of `index.html`.
- [ ] Replace the `og:image` (`assets/img/og.jpg`) if you change the tagline.
- [ ] Decide the real end condition for the launch offer (slots filled / a date) and make sure the site, WhatsApp replies and your Instagram posts say the same thing.
- [ ] Test on a real budget Android phone on 4G, not just your laptop.

## 6. Structure

```
kotelabs/
├── index.html            # home: hero, services, work slots, process, pricing, founders, contact
├── work.html             # empty-state work page (deliberate, not broken)
├── hamburger-demo.html   # interactive SVG hamburger-morph component demo
├── 404.html
├── robots.txt / sitemap.xml
├── assets/
│   ├── css/styles.css    # main site stylesheet, tokens at the top
│   ├── css/hamburger-morph.css # shared SVG stroke styles for the menu icon
│   ├── js/app.js         # UI: loader, menu, line reveals, manifesto, form → WhatsApp
│   ├── js/hamburger-morph.js # reusable spring-driven SVG menu button
│   ├── js/hero-scene.js  # persistent Three.js + GLSL particle galaxy
│   ├── fonts/            # self-hosted Geist, Geist Mono, Inter (no Google Fonts request)
│   ├── img/og.jpg        # 1200×630 social preview
│   ├── img/eduroute-preview.(webp|jpg)        # 1200×875 project screenshot
│   ├── img/goswami-optics-preview.(webp|jpg)  # 1200×773 project screenshot
│   ├── img/vansh.jpg     # founder portrait, 560×560 square (card)
│   └── img/vansh-sm.jpg  # same crop at 160×160 (hero chip)
├── vendor/
│   ├── three.module.min.js # Three.js r169 (MIT — licence must stay in the folder)
│   └── THREE-LICENSE.txt
├── vercel.json           # cache + security headers for Vercel
└── .gitignore
```

## 6b. What's in each file (for whoever edits next)

| File | What lives in it | Where to look first |
|---|---|---|
| `index.html` | The whole landing page. Sections are separated by `<!-- ===== SECTION ===== -->` banners and one section = one `<section>`. | Top-of-file comment explains `.line`, `.word` and `data-reveal` |
| `work.html` | Deliberately empty work page + founding-slot pitch | `#work` on `index.html` for the same card pattern |
| `404.html` | Static 404, no JS | — |
| `assets/css/styles.css` | Main stylesheet. Header block maps the sections; `:root` holds every colour and spacing token | `:root` tokens, then `.plan__price`, `.footer__wordmark` |
| `assets/css/hamburger-morph.css` | Shared SVG stroke treatment; size and colour use custom properties | `.hamburger-morph__path` |
| `assets/js/app.js` | All site UI behaviour, numbered §1–§15 (config, preloader, menu, reveals, manifesto, counters, accordions, form, lazy 3D loader) | `SITE` config at the top, §12b for the scroll colour grade |
| `assets/js/hamburger-morph.js` | Reusable SVG path morph controller with spring settling, reversal, keyboard/native-button and reduced-motion support | `HamburgerMorph.mount()` |
| `assets/js/hero-scene.js` | The Three.js + GLSL layer: spiral particle galaxy, cursor wake, scroll dispersion | particle count / arm layout, `uOpen` |
| `vercel.json` | Static hosting config (long cache for fonts/vendor, revalidate for CSS/JS, security headers) | — |

There is no build step: what you edit is what ships. Comments are deliberately short — the code is meant to be read, not decoded.

## 7. Animation system (what to expect)

| Element | Behaviour | Where in the code |
|---|---|---|
| Pre-loader | Counts 0→100 with status words, hard-capped at 3.2s, fades into the hero | `app.js` §2, `.loader` in CSS |
| Hero headline | Three lines wipe up from a mask, staggered | `.line > span`, `startHero()` |
| Hero 3D | Warm-white spiral galaxy of circular points; twinkles, responds to cursor and disperses as you scroll | `hero-scene.js` |
| Manifesto | Section pins for 260vh; each word lights up as you scroll | `app.js` §6, `.manifesto` in CSS |
| **Colour grade** | A separate CSS `.grade` wash shifts hue with scroll; the galaxy keeps its warm-white particle palette | `--grade` / `--grade-hue` in CSS |
| **Section tints** | Each section has its own subtle radial tint, cards are tinted glass | `#services` … `#contact` blocks in CSS |
| **Footer wordmark** | Same size, now a live spectrum: clip-wipe reveal left→right, flowing gradient, travelling white sheen | `.footer__wordmark` in CSS + `app.js` §12b |
| Section headings | Masked line reveals on scroll | `[data-lines]` + `.line` |
| Progress bar | 1px lime line under the header tracks page progress | `app.js` §3 |
| Mobile menu icon | Three SVG strokes fold through visible curves into an X; retargets smoothly on rapid input | `hamburger-morph.js`, `hamburger-morph.css` |
| Loader / reveals fallback | With `prefers-reduced-motion` everything is visible instantly and no 3D ships | end of CSS |

## 8. How the 3D behaves (the part most agency sites get wrong)

| Situation | Behaviour |
|---|---|
| Desktop, normal | A warm-white spiral galaxy of tiny dots, with a bright core, soft twinkle and a subtle cursor wake |
| Phone / tablet | Same scene, centred, DPR clamped to 1.5, 15k particles (7.6k on low-power) |
| Scrolling down the page | The spiral gradually loosens into a screen-wide field of particles; the dust stays subtle behind content |
| `prefers-reduced-motion: reduce` | Three.js is never downloaded; the static CSS galaxy fallback is shown |
| No WebGL / context lost | The canvas is removed and the CSS galaxy fallback remains |
| Off-screen or tab hidden | Render loop stops (no battery drain) |
| Slow connection | The script is fetched only when the hero enters the viewport |

## 9. Founder photos

Vansh's portrait is wired in at two sizes, both cropped from one square master:

| File | Size | Used for |
|---|---|---|
| `assets/img/vansh.jpg` | 560×560 | Founder card (rendered at 88px desktop / 76px mobile, circle-masked) |
| `assets/img/vansh-sm.jpg` | 160×160 | Vansh’s 32px hero avatar |
| `assets/img/deepesh.jpg` | 560×560 | Deepesh’s founder card portrait |

## 9b. Project screenshots

Each project card ships two files — `*-preview.webp` and `*-preview.jpg` — wrapped in a `<picture>`
so modern browsers download only the WebP (~40% smaller) and everything else falls back to the JPEG:

```html
<picture>
  <source srcset="assets/img/eduroute-preview.webp" type="image/webp">
  <img src="assets/img/eduroute-preview.jpg" alt="" width="1200" height="875" loading="lazy" decoding="async">
</picture>
```

Regenerate both from one full-resolution master, and keep the `width`/`height` attributes in sync with
the real pixel size — they reserve the box so the card does not jump while the image loads:

```bash
cd assets/img
convert master.png -resize 1200x -quality 90 -strip eduroute-preview.webp
convert master.png -resize 1200x -quality 86 -strip -interlace Plane eduroute-preview.jpg
```

The crop is deliberately **face-first**: hair touches the top of the circle, chin sits at ~80%, ears just inside the edge — so the face fills the avatar instead of floating in it. The head is nudged ~5% right of the frame centre to compensate for head tilt.

To replace either founder portrait:

1. Crop the photo **square, roughly 560×560**, tight on the head: hair just inside the top edge, chin near the bottom, ears at the sides. That is what the circle mask frames.
2. Export two JPEGs at quality 88: `560×560` (card) and `160×160` (hero chip), with a light `UnsharpMask` before saving so the downscale stays crisp.
3. Replace the `.founder__photo` block in the founders section:

```html
<span class="founder__photo">
  <img src="assets/img/deepesh.jpg" width="560" height="560"
       alt="Deepesh Chauhan, founder of KotaLabs" decoding="async">
</span>
```

Use the same `.founder__photo` pattern for either founder. The CSS needs no changes — it handles the crop, circle mask, ring, hover zoom and inner shadow.

## 10. Honest to-do list for the copy

The wording is written to convert Kota SMB clients (pricing visible, WhatsApp first, no jargon),
but you should rewrite anything that doesn't sound like you:

- The hero line ("Websites that make Kota businesses look national.")
- The manifesto paragraph — it is the most opinionated copy on the site
- The process timelines (3–4 weeks, 2 revision rounds, 30–60 days support) — make them true
- The "founding client" promises on `work.html`
- The stats row (<2.5s load, 100% yours, 2 hrs reply)
- The launch-offer terms and the regular prices behind them — these must be prices you'd genuinely charge

Nothing on this site claims a client or a result you don't have yet. Keep it that way.
