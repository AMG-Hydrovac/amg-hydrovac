# CLAUDE.md — AMG Hydrovac website

Guidance for working on this site. Read this before changing anything.

## What this is

Premium-industrial marketing site for **AMG Hydrovac** (non-destructive hydro excavation,
GTA + Southern Ontario). Live at **https://amghydrovac.ca** (canonical, no `www`).
Three jobs, equally weighted: win GC/utility subcontract work, look credible in bids,
generate quote requests.

## Stack — do not migrate

Self-contained static site. **No build step, no frameworks, no dependencies.**
Plain HTML + one CSS file + one vanilla-JS file. Any "add a framework" instinct is wrong here.

| Path | Role |
|---|---|
| `index.html` | Home: hero → trust marquee → why-hydrovac → services → process → why-AMG → stats → capabilities teaser → service area (+ checker) → AMG Standard (+ PDF card) → [testimonials, disabled] → CTA |
| `services.html` | 12-service directory grid (`.svc-index`) + 8 deep-dive rows + industries + FAQ |
| `capabilities.html` | Capability grid + **job-site gallery + lightbox** + what-you-get (+ PDF card) |
| `about.html` | Story, safety/compliance (cert chips incl. WSIB), values, stats |
| `contact.html` | Quote form (Web3Forms, **live key**) + dispatch info |
| `assets/css/styles.css` | Entire design system. Tokens in `:root` at top. |
| `assets/js/main.js` | All behavior, one IIFE, every feature guarded by element existence. |

Preview: `.claude/launch.json` → `preview-server.cjs` on **port 8099**
(Node at `C:\Program Files\nodejs\node.exe`).

## Locked design rules

- **Palette is locked.** Near-black surfaces (`--ink #090B10`, `--surface #0E1116`) +
  safety amber (`--amber #F5A623`). Only tints/shades of existing tokens. No new hues.
- **Type:** Anton (display, uppercase, tight leading) + Inter (body). Fluid scale via `clamp()` tokens.
- **Motion:** `transform`/`opacity` only. Scroll reveals via IntersectionObserver (`.reveal` +
  `data-delay="1..5"`), triggered once. Everything honors `prefers-reduced-motion` (global kill
  switch at bottom of styles.css). Particles/parallax auto-disabled on small screens.
- **Honesty rule (critical):** no fabricated testimonials, stats, past projects, or certs.
  The testimonials section in `index.html` is intentionally commented out with enable
  instructions — populate only with real, permission-granted quotes. WSIB/insurance claims
  are listed because the owner attests to them; add COR/ORCGA/TSSA only when actually held.
- **NAP consistency (SEO):** name `AMG Hydrovac`, phone `+1-888-482-4504` / `tel:+18884824504`,
  URL `https://amghydrovac.ca` (non-www) — identical in JSON-LD, canonicals, sitemap, robots,
  and Google Business Profile. Don't drift.

## Components added July 2026 (conventions)

- **Real photos — ONE placement each, and ONE JOB per tile (hard rules).** Never show two
  angles of the same job under different service labels (owner correction 2026-07-09).
  6 files in `assets/img/gallery/`: capabilities `#gallery` 2×2 = `watermain-01.jpg` (job 3,
  operator visible WITH consent 2026-07-06) + `potholing-02.jpg` (job 4, test pothole) +
  `locating-01.jpg` (job 6, duct bank + fibre bundle + gas line pit) + `trench-01.jpg` (job 2 —
  trench between ROAD AND SIDEWALK, not a foundation; owner corrected 2026-07-09).
  `trench-02.jpg` (job 5, boulevard trench past a tree) lives on the services.html
  slot-trenching row media-frame. `daylighting-01.jpg` (job 1's ONLY placement) on the home
  "Why Hydrovac" `.media-frame--tall` (portrait 920×1150, 4/5). Do NOT reference a
  photo in two places or under a service it doesn't show. **`truck-01.jpg` was deliberately
  deleted** — the unit still wears the previous owner's decals/number; a branded truck photo is
  coming. All photos were cropped from the owner's job photos to **remove faces (no crew
  consent)** and run through sharp (EXIF/GPS stripped). Source originals + crop scripts:
  `../AMG-real-pictures/` and `../logo-build/*-photos.cjs`. Missing file → inline `onerror` adds
  `.is-missing` → styled placeholder (`.g-ph`). All other `.media-frame`s on index/about/services
  are `.ph` placeholder divs until real photos of those services exist (no frost/remote/trench/
  truck photo yet). `.media-frame img` = absolute cover, if you add one.
- **Lightbox** (`.lightbox`): native `<dialog>`, one per page that has a gallery. Only opens for
  images that actually loaded (`lbLoaded()` in main.js). Arrow keys navigate, Esc/backdrop close.
- **Service-area checker** (`.area-check`, home page): pure client-side. Data lives in main.js —
  `AREA_CITIES` (city + community aliases), `AREA_FSA` (3-char postal prefixes), `AREA_M`
  (Toronto M-codes). Unknown input → honest "contact us to confirm", never a false yes.
  Coverage list = the 33 municipalities in `AREA_CITIES`; keep region chips, contact-form
  region options, and JSON-LD `areaServed` in sync with it.
- **Sticky mobile bar** (`.sticky-bar`, all pages, <1024px): call + quote, appears past 360px
  scroll. Footer gets bottom padding at mobile so the bar never covers content.
- **Capability statement** (`.dl-card` on index + capabilities, plus a footer link on every page)
  → `/capability-statement.pdf` (in place; owner overwrites the file to update it — links never change).
- **Service directory** (`.svc-index`, services.html): the canonical 12-service list + copy.
  Keep it in sync with both JSON-LD offer catalogs (index + services).
- **Hero depth ruler** (`.hero__ruler`, index, ≥1100px only): decorative signature motif,
  `aria-hidden`, safe to remove if it ever fights the layout.

## Form (do not break)

Web3Forms, POST to `https://api.web3forms.com/submit`, live `access_key` in `contact.html`.
Field names matter — especially **`email`** (Web3Forms reply addressing; JS also copies it to
`replyto`). Client-side validation gates the fetch; success swaps to `#form-success`
("…within one business day…"). **Never test-submit with valid data — it emails the owner.**

## In place (do not re-request from owner)

`capability-statement.pdf` · first batch of real job photos · `assets/img/og.jpg` (1200×630,
branded, referenced by og:image on every page) · `favicon.svg` / `favicon-48.png` /
`apple-touch-icon.png` · `privacy.html` (footer "Privacy" links here; Terms/H&S links were
removed until real documents exist).

## Still owner-supplied / pending

Real certs as earned, testimonials, a photo of the re-branded truck (then restore a Fleet
tile/frames), and photos of frost / remote-hose work (those services show in copy but
deliberately have no photo yet — honesty rule). Socials: the footer LinkedIn icon links to
https://www.linkedin.com/company/amg-hydrovac (also in index JSON-LD `sameAs`); Facebook/
Instagram icons were REMOVED — re-add them only when real accounts exist.
