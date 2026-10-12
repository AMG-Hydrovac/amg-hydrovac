# AMG Hydrovac — Website

A self-contained, premium-industrial marketing site for **AMG Hydrovac Ltd.** (Southern Ontario).
No build step, no frameworks, no dependencies — pure HTML, CSS and vanilla JS. It runs on any
device and can be hosted anywhere (Netlify, Vercel, Cloudflare Pages, GoDaddy, S3, even opened
straight from disk).

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Home — hero, services overview, process, safety, stats, projects, service area, testimonials |
| `services.html` | Detailed services, industries served, FAQ |
| `capabilities.html` | What the company is built to handle (honest framing — no fabricated past projects) |
| `about.html` | Story, safety & compliance, values |
| `contact.html` | Quote-request form + contact details (the conversion page) |

## View it locally
Just double-click `index.html`. For the cleanest experience (so relative paths and fonts behave
exactly like production), serve the folder:

```bash
# Python 3
cd amg-hydrovac
python -m http.server 8080
# then open http://localhost:8080
```

## Deploy
Upload the whole `amg-hydrovac/` folder to any static host. That's the entire site.

---

## ✏️ Placeholders to swap (everything is centralized & easy to find)

All placeholder data is repeated consistently across pages — a find-and-replace handles each:

| Placeholder | Replace with | Where |
|-------------|--------------|-------|
| `1-888-482-4504` and `tel:+18884824504` | Confirm/replace phone | header, footer, CTAs, contact page |
| Department emails (`quotes@`, `info@`, `billing@`, `safety@`, `careers@`, `dispatch@` `amghydrovac.ca`) | Create these inboxes (or forward them all to one) | footer + contact "Departments" |
| `Greater Toronto Area` / service regions | Your real base + coverage | footer, contact, home |
| Stats (`6+`, `8`, `100%`) | Confirm they're accurate for you | look for `data-count="…"` |
| Social links (`href="#"`) | Your LinkedIn / Facebook / Instagram | footer of every page |
| `capability-statement.pdf` | Drop your real PDF at `amg-hydrovac/capability-statement.pdf` | download card on home + capabilities, footer link on every page |
| Gallery photos | Drop JPGs into `assets/img/gallery/` with the filenames documented in `capabilities.html` (search for "JOB-SITE GALLERY") | placeholders swap out automatically |

> All credibility copy is **honest by design** — no fabricated track record, testimonials, or unearned
> certifications (COR/ORCGA/TSSA were intentionally removed). Add real certs to the trust strip
> (`index.html`) and `about.html` the moment you hold them.

> Tip: search the project for `482-4504`, `amghydrovac.ca`, and `data-count` to find placeholders fast.

## 🖼️ Photos
Real job photos are live (faces only with consent, EXIF/GPS stripped): four gallery tiles on
the capabilities page (watermain, potholing, utility locating, slot trenching — each from a
different job), `daylighting-01.jpg` on the home "Why Hydrovac" panel, and `trench-02.jpg` on
the services slot-trenching row. **Rules: each photo appears in exactly one place, only under
the service it actually shows, and never two angles of the same job under different services.**
Remaining framed panels are styled placeholders until real photos of those services exist.
The social-share image (`assets/img/og.jpg`, 1200×630, branded) is also in place.

To add a new photo: drop the JPG in `assets/img/gallery/`, then either add a `<figure>` tile in
`capabilities.html#gallery` or swap a `.media-frame`'s `<div class="ph">…</div>` for:
```html
<img src="assets/img/gallery/your-photo.jpg" alt="Honest description" loading="lazy" decoding="async" />
```

## 📨 Quote form (live)
The form (`contact.html`) is wired to **Web3Forms** with a live access key — submissions are
emailed to the address that key is registered to, with reply-to set to the requester's email.
Client-side validation runs first; a successful send shows the on-page confirmation.
Don't rename the `email` field (Web3Forms uses it for reply addressing).

## ✨ Interactive features
- **Service-area checker** (home): type a city or postal code → instant yes / contact-to-confirm.
  Coverage data lives in `assets/js/main.js` (`AREA_CITIES` / `AREA_FSA`).
- **Job-site gallery + lightbox** (`capabilities.html#gallery`): lazy-loaded, keyboard-accessible
  native `<dialog>` lightbox. Shows styled placeholders until real photos are dropped in.
- **Sticky mobile bar**: 24/7 call + quote buttons on phones, appears after scrolling.
- **Capability Statement** download cards + footer links → `/capability-statement.pdf`.
- **Testimonials section**: built but disabled in `index.html` — enable only with real quotes
  (instructions are in the comment around it).

## Design system
- **Type:** Anton (display) + Inter (body), loaded from Google Fonts with system fallbacks.
- **Palette:** charcoal/steel surfaces with a safety-amber accent — all defined as CSS custom
  properties at the top of `assets/css/styles.css` (`:root`). Change the brand color in one place.
- **Animations:** scroll reveals, count-ups, hero particle field, subtle parallax, marquee — all
  GPU-friendly and automatically disabled for `prefers-reduced-motion` and scaled back on small screens.

## Accessibility & performance notes
- Semantic landmarks, skip link, keyboard-operable menu & accordion, visible focus states.
- No render-blocking JS (deferred), no external libraries, inline SVG icons.
- JSON-LD `LocalBusiness` / `Service` structured data for local SEO.
