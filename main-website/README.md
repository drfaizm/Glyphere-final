# Glyphere — Dynamic Font Marketplace System
### Complete setup, usage, and how-to-add-new-fonts guide

---

## Folder Structure

```
your-project/
│
├── data/
│   └── fonts.js              ← ALL font data lives here (your single source of truth)
│
├── fonts/
│   └── index.html            ← Master detail template (ONE page for ALL fonts)
│
├── css/
│   ├── globalstyle.css       ← Existing global styles (nav, footer, animations)
│   └── marketplace-system.css ← New system styles (catalog grid + detail page)
│
├── js/
│   ├── shared.js             ← GlyphereDB, GlyphereRouter, GlyphereLoader, helpers
│   ├── catalog.js            ← Renders font grid, filters, type tester on marketplace
│   └── font-detail.js        ← Renders hero, tester, glyphs, details on detail page
│
├── javascript/
│   └── globalscript.js       ← Existing global JS (nav, preloader, hamburger)
│
├── marketplace-v2.html       ← New marketplace page (uses catalog.js)
└── homepage.html             ← Existing homepage
```

---

## How It Works — The Core Idea

```
URL: /fonts/index.html?font=nova-legacy
                              ↓
                    GlyphereRouter.getSlug()
                              ↓
                     slug = "nova-legacy"
                              ↓
                    GlyphereDB.get(slug)
                              ↓
                  Returns font data object
                              ↓
         font-detail.js renders all sections:
         → Hero (name, price, specimen)
         → Live type tester
         → Styles & weights
         → Glyph character map
         → License & formats
         → Designer info
         → Related fonts
```

---

## How to Add a New Font (3 Steps Only)

### Step 1: Add to `data/fonts.js`

```js
// Add this object to the GLYPHERE_FONTS array:
{
  id: 7,
  slug: "aurora-display",          // URL slug: /fonts/index.html?font=aurora-display
  name: "Aurora Display",
  tagline: "Northern lights in letterform.",
  category: "display",             // serif | sans-serif | geometric | display | script
  tags: ["bold", "editorial"],
  description: "Full description text here...",
  price: 79,
  salePrice: null,                 // set a number for sale price, null = no sale
  styles: ["Regular", "Bold"],
  weights: [400, 700],
  glyphCount: 200,
  languageSupport: ["Latin Extended", "Symbols"],
  formats: ["OTF", "TTF", "WOFF2"],
  licenseTypes: ["Personal", "Commercial", "Brand"],
  previewText: "Beyond the horizon.",
  chars: "AaBbCcDdEeFf 0123456789 !?.,",
  fontFamily: "'Aurora Display', sans-serif",
  fontFaceUrl: "/homepage-updated/fonts/Aurora_Display.woff2", // path to font file
  googleFont: null,               // OR: Google Fonts URL string
  fallback: "Impact, sans-serif",
  theme: "dark",                  // "dark" or "cream"
  accentColor: "#c9ab81",
  designer: {
    name: "Your Name",
    studio: "Glyphere",
    bio: "Independent type designer.",
    avatar: "/homepage-updated/faiz.jpeg"
  },
  releaseDate: "2024-07",
  featured: false,
  relatedSlugs: ["monument-grotesk"],
  glyphs: ["A","B","C",...,"z","0","1",...,"9","!"," "]
}
```

### Step 2: Add `@font-face` in `css/globalstyle.css`

```css
@font-face {
  font-family: 'Aurora Display';
  src: url('/homepage-updated/fonts/Aurora_Display.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### Step 3: Done ✦

Your new font now automatically appears:
- ✅ In the marketplace catalog grid
- ✅ At its own detail page: `/fonts/index.html?font=aurora-display`
- ✅ In the type tester dropdown on both pages
- ✅ In Related Fonts sections of other fonts (if you add its slug to `relatedSlugs`)
- ✅ In category/search filters
- ✅ In sort by price, name, featured

**No new HTML page needed. Ever.**

---

## Font Data Schema — All Fields Explained

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | number | ✓ | Unique integer ID |
| `slug` | string | ✓ | URL-safe identifier. Must be unique. Use hyphens. |
| `name` | string | ✓ | Display name of the font |
| `tagline` | string | ✓ | One-line description shown on cards |
| `category` | string | ✓ | `serif`, `sans-serif`, `geometric`, `display`, `script` |
| `tags` | string[] | — | Keywords for search |
| `description` | string | ✓ | Full paragraph shown on detail page |
| `price` | number | ✓ | Base price in USD (no $ sign) |
| `salePrice` | number\|null | — | Sale price. `null` = no sale |
| `styles` | string[] | — | e.g. `["Regular", "Bold", "Italic"]` |
| `weights` | number[] | — | CSS weights matching styles, e.g. `[400, 700]` |
| `glyphCount` | number | — | Total glyph count shown on page |
| `languageSupport` | string[] | — | e.g. `["Latin Extended", "Arabic"]` |
| `formats` | string[] | — | `OTF`, `TTF`, `WOFF`, `WOFF2`, `Variable` |
| `licenseTypes` | string[] | — | `Personal`, `Commercial`, `Brand`, `Enterprise` |
| `previewText` | string | — | Text shown on hero specimen card |
| `chars` | string | — | Characters shown in card specimen row |
| `fontFamily` | string | ✓ | CSS `font-family` value with quotes |
| `fontFaceUrl` | string\|null | — | Path to font file. `null` = uses googleFont |
| `googleFont` | string\|null | — | Google Fonts `<link>` href. `null` = uses fontFaceUrl |
| `fallback` | string | — | CSS fallback fonts |
| `theme` | string | — | `"dark"` = black card, `"cream"` = cream card |
| `accentColor` | string | — | Hex color for accents on detail page |
| `designer.name` | string | — | Designer's name |
| `designer.studio` | string | — | Studio name |
| `designer.bio` | string | — | Short bio |
| `designer.avatar` | string | — | Path to avatar image |
| `releaseDate` | string | — | `"YYYY-MM"` format |
| `featured` | boolean | — | `true` = shows "Featured" badge, sorts first |
| `relatedSlugs` | string[] | — | Slugs of related fonts (max 3 recommended) |
| `glyphs` | string[] | — | Individual characters for glyph map |

---

## URL Routing

The system supports two URL formats:

```
# Query param (works without a server rewrite — recommended):
/fonts/index.html?font=nova-legacy

# Clean URL (needs server rewrite rule or hosting config):
/fonts/nova-legacy
```

For clean URLs on a static host, add a `_redirects` file (Netlify) or `vercel.json`:

**Netlify `_redirects`:**
```
/fonts/*  /fonts/index.html?font=:splat  200
```

**Vercel `vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/fonts/:slug", "destination": "/fonts/index.html" }
  ]
}
```

Then `GlyphereRouter.getSlug()` automatically reads from the pathname.

---

## Script Load Order (Important)

Both pages require scripts in this exact order:

```html
<!-- 1. Font data (populates window.GLYPHERE_FONTS) -->
<script src="../data/fonts.js"></script>

<!-- 2. Shared utilities (GlyphereDB, GlyphereRouter, etc.) -->
<script src="../js/shared.js"></script>

<!-- 3. Page-specific renderer -->
<script src="../js/catalog.js"></script>      <!-- on marketplace page -->
<!-- OR -->
<script src="../js/font-detail.js"></script>  <!-- on font detail page -->

<!-- 4. Global nav/hamburger (existing file) -->
<script src="../javascript/globalscript.js"></script>
```

---

## Scaling to 100+ Fonts

The system is designed to handle hundreds of fonts with no performance loss:

**Filtering & Search** — All done client-side in memory. With 100 fonts, this is instant.

**Font Loading** — `GlyphereLoader` uses lazy `@font-face` injection with `font-display: swap`. Only the fonts currently visible in the viewport get their families loaded. On the detail page, only the single selected font is injected.

**SEO** — Each font gets unique `<title>` and `<meta description>` set by `renderMeta()`. URLs are slug-based and readable.

**Adding fonts** — Always just one entry in `fonts.js`. Never touch HTML.

**Pagination** (when needed for 100+ fonts):
```js
// In catalog.js, modify getVisible() to add pagination:
const PAGE_SIZE = 12;
let currentPage = 0;

function getVisible() {
  const all = /* existing filter/sort logic */;
  return all.slice(0, (currentPage + 1) * PAGE_SIZE);
}

// Add a "Load More" button that increments currentPage and re-renders
```

---

## Using a Google Font (No file upload needed)

If your font is on Google Fonts, set `googleFont` instead of `fontFaceUrl`:

```js
{
  slug: "cormorant-garamond",
  name: "Cormorant Garamond",
  fontFamily: "'Cormorant Garamond', serif",
  fontFaceUrl: null,
  googleFont: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,300&display=swap",
  fallback: "Georgia, serif",
  // ... rest of fields
}
```

`GlyphereLoader.load()` automatically injects the Google Fonts `<link>` tag at runtime.

---

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|---|---|
| `fontFamily: "My Font"` | `fontFamily: "'My Font', sans-serif"` |
| `slug: "My Font"` | `slug: "my-font"` |
| `salePrice: 0` | `salePrice: null` (0 would show $0) |
| `glyphs: "ABCDE..."` | `glyphs: ["A","B","C","D","E"]` |
| Adding detail HTML page | Never. Only add to `fonts.js` |
| Scripts in wrong order | `fonts.js` → `shared.js` → page script |

---

## Files Summary

| File | Purpose |
|---|---|
| `data/fonts.js` | **Only file you edit** to add/update fonts |
| `fonts/index.html` | Master detail page template (never touch) |
| `marketplace-v2.html` | Marketplace catalog page (never touch) |
| `css/marketplace-system.css` | All styles for both pages |
| `js/shared.js` | DB lookup, router, font loader, DOM helpers |
| `js/catalog.js` | Grid render, filters, sort, type tester |
| `js/font-detail.js` | Hero, tester, styles, glyphs, license, related |

---

*Built for Glyphere — From Glyph to Identity.*
