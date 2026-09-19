# Glyphere — Design System & Style Guide
### Complete Reference for Brand Identity, Color Tokens, Typography, Layout & UI Architecture

---

## 1. Brand Philosophy & Aesthetic Identity

**Glyphere** is a luxury digital type foundry and bespoke typography atelier specializing in custom brand typefaces, logo typography, and high-precision digital font licenses.

### Core Design Principles
1. **Neo-Editorial Elegance**: Clean, gallery-grade aesthetics inspired by high-fashion publications, architectural monographs, and artisan European printing foundries.
2. **Typography First**: All UI surfaces, borders, and controls exist solely to elevate and showcase the letterforms and glyph specimens.
3. **High-Contrast Precision**: Razor-sharp distinction between ink (`#0F1013`), canvas (`#FBFBF9`), and metallic champagne bronze accents (`#B38C52` / `#82602B`).
4. **Tactile Micro-Interactions**: Fluid, physics-based transitions (`cubic-bezier(0.16, 1, 0.3, 1)`) that reward interaction without visual clutter.

---

## 2. Color System & Design Tokens

Glyphere utilizes a tokenized CSS Custom Property architecture defined in `css/globalstyle.css`.

### 2.1 Core Palette Tokens

```css
:root {
    /* ── Primary / Obsidian Inks ── */
    --color-primary:                  #0f1013; /* Deep obsidian ink — headings, dark buttons, primary text */
    --color-primary-light:            rgba(15, 16, 19, 0.4);
    --color-on-primary:               #faf8f5; /* Off-white text on dark buttons */
    --color-primary-container:        #1d1e22; /* Graphite container — dark cards, hover states */
    --color-primary-container-light:  rgba(29, 30, 34, 0.4);
    --color-on-primary-container:      #c4b69d; /* Muted bronze text on dark container */
    --color-primary-tint-light:       #eae6dd; /* Light architectural tint */
    --color-on-primary-fixed:         #0c0d0f; /* Pitch text for cards */
    --color-on-primary-fixed-variant: #2d2e33; /* Dark slate for font card meta */
    --color-inverse-primary:          #d5cfc4; /* Inverse border tone */
    --color-inverse-surface:          #1d1e22; /* Dark tooltip / overlay surface */
    --color-inverse-on-surface:       #faf8f5; /* Light text on inverse surface */
    --color-gradient:                 linear-gradient(135deg, #1d1e22 0%, #0f1013 100%);
    --color-on-gradient:              #151619;
    --color-heading-on-gradient:      #f8f6f0;
    --body-text-on-gradient:          #b5aba0;

    /* ── Secondary / Slate Copy ── */
    --color-secondary:                #4a4a4f; /* Editorial slate — body descriptions, captions */
    --color-on-secondary:             #faf8f5;
    --color-secondary-container:      #e8e5dc;
    --color-on-secondary-container:   #44454a;

    /* ── Tertiary / Champagne Bronze & Gold ── */
    --color-tertiary:                 #2e2204;
    --color-on-tertiary:              #faf8f5;
    --color-tertiary-container:       #4a3810;
    --color-on-tertiary-container:    #c49d5c;
    --color-selection-bg:             #dcc8a4; /* Text selection highlight background */
    --color-selection-text:           #1a1405; /* Text selection foreground */

    /* ── Surface Hierarchy ── */
    --color-surface:                  #f7f6f2; /* Architectural stone neutral base */
    --color-on-surface:               #111215; /* Primary ink body color */
    --color-surface-variant:          #eae6dd; /* Input backgrounds, preview tiles */
    --color-on-surface-variant:       #4a4a4f; /* Muted secondary body text */
    --color-surface-dim:              #dfdbd2; /* Dimmed hover track */
    --color-surface-container-lowest: #ffffff; /* Pure white card surface */
    --color-surface-container-low:    #f5f4ef; /* Low-elevation card */
    --color-surface-container:        #edebe4; /* Section containers, badge fills */
    --color-surface-container-high:   #e5e2d8; /* Elevated container fill */
    --color-surface-container-highest:#dbd7cc; /* High-contrast card border */

    /* ── Canvas Background ── */
    --color-background:               #fbfbf9; /* Gallery off-white canvas */
    --color-on-background:            #111215; /* Deep text on canvas */

    /* ── Outlines & Dividers ── */
    --color-outline:                  #7d756b; /* Hairline borders, subtle icons */
    --color-outline-variant:          #d5cfc4; /* Secondary card dividers */

    /* ── Feedback States ── */
    --color-error:                    #ba1a1a; /* Error badges & form validation */

    /* ── Signature Metallic Accents ── */
    --gold:                           #b38c52; /* Primary champagne bronze */
    --gold-mid:                       #c49d5c; /* Satin metallic highlight */
    --gold-dark:                      #82602b; /* Deep bronze (WCAG AA compliant on light) */
    --gold-light:                     #eedbc0; /* Soft pill highlight / subtle glow */
}
```

### 2.2 Palette Summary Table

| Category | Token | Hex | Intended Role |
| :--- | :--- | :--- | :--- |
| **Canvas** | `--color-background` | `#FBFBF9` | Main page canvas background |
| **Surface** | `--color-surface` | `#F7F6F2` | Standard card and section backgrounds |
| **Container** | `--color-surface-container` | `#EDEBE4` | Pill tags, input boxes, specimen trays |
| **White** | `--color-surface-container-lowest` | `#FFFFFF` | Elevated interactive cards, floating dropdowns |
| **Primary Ink**| `--color-primary` / `--color-on-surface` | `#0F1013` | Headline typography, dark CTA buttons |
| **Body Slate** | `--color-secondary` / `--color-on-surface-variant` | `#4A4A4F` | Paragraphs, meta labels, subtitles |
| **Gold / Accent**| `--gold` | `#B38C52` | Accent lines, icons, hover borders, stars |
| **Deep Bronze**| `--gold-dark` | `#82602B` | Small caps eyebrow kickers, badge text |
| **Soft Champagne**| `--gold-light` | `#EEDBC0` | Subtle badge backgrounds, hover glows |
| **Divider** | `--color-outline-variant` | `#D5CFC4` | Hairline grid lines and container borders |

---

## 3. Typography System

Glyphere combines strong geometric display type with high-legibility humanist sans and editorial serifs.

### 3.1 Font Families

| Role | Font Family | Fallback | Sourcing |
| :--- | :--- | :--- | :--- |
| **Headlines / Display** | `'Bricolage Grotesque'` | `sans-serif` | Google Fonts (`opsz,wght@12..96,700;12..96,800`) |
| **Body / Primary UI** | `'Manrope'` | `system-ui, sans-serif` | Google Fonts (`wght@300;400;500;600;700`) |
| **Technical / Sub-UI**| `'Instrument Sans'` | `sans-serif` | Google Fonts (`wght@400;500;600;700`) |
| **Editorial Serif** | `'Playfair Display'` | `Georgia, serif` | Google Fonts (`ital,wght@0,400;0,700;1,400`) |
| **Monospace / Code** | `'JetBrains Mono'` | `Courier New, monospace` | Google Fonts (`wght@300;400`) |

### 3.2 Foundry Proprietary Font Stack
Glyphere showcases in-house display typefaces loaded locally via `@font-face`:
* **Nova Legacy**: Modern geometric serif with extreme contrast.
* **Sonnet Italic**: Fluid, high-fashion calligraphic editorial italic.
* **Midnight Citadel**: Heavy architectural display headline face.
* **Pebble Sans**: Humanist organic sans-serif.
* **Storybook Sans**: Playful editorial geometric grotesque.
* **Mistavio Sans**: Sharp neo-grotesque display.
* **Turbo Block**: Bold, brutalist athletic headline font.
* **Vellum Flow**: Fluid luxury script face.
* **Stadium Bold**: Monumental, impactful condensed display.

### 3.3 Type Scale Hierarchy

| Style Level | Size (Desktop / Fluid) | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `clamp(3.5rem, 8vw, 7rem)` | 800 | 0.95 | `-0.04em` |
| **H1 Headline** | `clamp(2.5rem, 5vw, 4.5rem)` | 800 | 1.05 | `-0.03em` |
| **H2 Section** | `clamp(2rem, 3.5vw, 3rem)` | 700 | 1.15 | `-0.02em` |
| **H3 Card Title** | `1.35rem – 1.75rem` | 700 | 1.25 | `-0.01em` |
| **Body Large** | `1.125rem` (18px) | 400 | 1.60 | `0` |
| **Body Regular** | `1.000rem` (16px) | 400 | 1.55 | `0` |
| **Body Small / Meta**| `0.875rem` (14px) | 400 / 500 | 1.50 | `+0.01em` |
| **Eyebrow / Kicker** | `0.6875rem` (11px) | 600 / 700 | 1.00 | `+0.18em` (Uppercase) |
| **Micro Badge** | `0.6125rem` (10px) | 600 | 1.00 | `+0.08em` (Uppercase) |

---

## 4. Spacing, Elevation & Corner Radii

### 4.1 Spacing Scale (8pt Grid)
* `xs`: `0.25rem` (4px)
* `sm`: `0.5rem` (8px)
* `md`: `1rem` (16px)
* `lg`: `1.5rem` (24px)
* `xl`: `2rem` (32px)
* `2xl`: `3rem` (48px)
* `3xl`: `5rem` (80px)
* `4xl`: `8rem` (128px)

### 4.2 Corner Radii Tokens
* `--radius-sm`: `0.125rem` (2px)
* `--radius`: `0.25rem` (4px)
* `--radius-lg`: `0.5rem` (8px)
* `--radius-xl`: `1.25rem` (20px) — standard card radius
* `--radius-2xl`: `1.5rem` (24px) — hero cards & modal sheets
* `--radius-full`: `40px` / `50px` — capsule badges & pill buttons

### 4.3 Shadows & Elevation
```css
--shadow-sm: 0 2px 8px rgba(15, 16, 19, 0.03);
--shadow-md: 0 12px 32px rgba(15, 16, 19, 0.06);
--shadow-lg: 0 24px 60px rgba(15, 16, 19, 0.08);
--shadow-glow: 0 0 20px rgba(179, 140, 82, 0.18);
```

---

## 5. Component Design Specifications

### 5.1 Capsule Eyebrow Badges
* **Typography**: `'Instrument Sans'`, `0.6875rem`, weight 600, uppercase, letter-spacing `0.18em`.
* **Color**: `var(--gold-dark)`.
* **Border lines**: Hairline pseudo-elements `::before` and `::after` (`28px x 1px`, `var(--gold)`, opacity 0.5).

### 5.2 Status Pills & Trust Badges
* **Background**: `var(--color-background)` (`#FBFBF9`).
* **Border**: `1px solid rgba(179, 140, 82, 0.20)`.
* **Radius**: `50px`.
* **Hover State**: `border-color: var(--gold); background: #FFFFFF; transform: translateY(-2px);`.
* **Live Pulsing Dot**: `6px x 6px`, `#22C55E` emerald with 2s keyframe scale glow.

### 5.3 Interactive Font Tester Playground
* **Canvas Box**: White surface (`#FFFFFF`) with `20px` radius, subtle outer shadow, and hairline boundary `1px solid rgba(15, 16, 19, 0.08)`.
* **Controls Bar**: Gallery background (`#FBFBF9`) with tab pills and range sliders.
* **Sliders**: Slim `4px` tracks (`rgba(15, 16, 19, 0.10)`) with gold thumb knobs (`#B38C52`) that scale on hover.
* **Editable Text Canvas**: Borderless, caret colored in `var(--gold)`, dynamic font sizing.

### 5.4 Primary & Secondary Buttons
* **Primary Button**:
  * Background: `var(--color-primary)` (`#0F1013`).
  * Text: `var(--color-on-primary)` (`#FAF8F5`).
  * Hover: `var(--color-primary-container)` (`#1D1E22`), `transform: translateY(-1px)`.
* **Ghost / Bronze Button**:
  * Background: `transparent`.
  * Border: `1px solid rgba(179, 140, 82, 0.35)`.
  * Text: `var(--color-primary)`.
  * Hover: `border-color: var(--gold); background: rgba(179, 140, 82, 0.06);`.

---

## 6. Motion & Animation Curves

| Variable / Easing | Formula | Usage |
| :--- | :--- | :--- |
| **`--transition-smooth`** | `all 0.4s cubic-bezier(0.16, 1, 0.3, 1)` | Modals, menu drawers, card scale |
| **`--transition-snappy`** | `all 0.25s cubic-bezier(0.23, 1, 0.32, 1)`| Button hovers, slider thumb drag |
| **`--transition-fade`** | `opacity 0.3s ease-in-out` | Tab switching, image cross-fades |

---

## 7. Accessibility (WCAG 2.1 AA Compliance)

1. **Text Contrast Ratios**:
   * Ink on Background: `#0F1013` on `#FBFBF9` = **18.2:1** (Passes AAA).
   * Slate on Background: `#4A4A4F` on `#FBFBF9` = **8.1:1** (Passes AAA).
   * Bronze Gold on Canvas: `#82602B` on `#FBFBF9` = **4.9:1** (Passes AA for all text sizes).
2. **Interactive States**:
   * All inputs, buttons, and editable specimen elements feature distinct `:focus-visible` outlines using `var(--gold)` and subtle glow rings.
3. **Reduced Motion**:
   * Non-critical parallax, marquee scrolls, and pulse animations obey `@media (prefers-reduced-motion: reduce)`.
