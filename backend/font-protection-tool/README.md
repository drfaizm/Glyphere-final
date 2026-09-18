# 🛡️ Glyphere Font Protection & Preview Subsetter Tool

This tool automates the **preview-only subsetting process** used by major commercial type foundries. It converts your master `.otf` or `.ttf` files into stripped, lightweight `.woff2` files for your website.

---

## Why Subsetting Protects You Against Theft
When a visitor opens Chrome / Firefox / Safari Developer Tools, they can inspect the network requests and download the fonts loaded on your site.

By using this tool to generate your web fonts:
1. **Kerning is Stripped (`GPOS`)**: Pairs like `AV`, `To`, `We`, `Yo` have no optical spacing. In Adobe Illustrator / Photoshop / Figma, body copy and headlines will look uneven and unpolished.
2. **OpenType Features Removed (`GSUB`)**: Discretionary ligatures, swashes, and stylistic sets are removed.
3. **Accented Characters Dropped**: Characters like `À, É, ñ, ç, ö, ü` are omitted. The font cannot be used for European or international client projects.
4. **Commercial Symbols Omitted**: `©, ®, ™, €, £, ¥` are stripped.
5. **Super Lightweight**: Reduces file size by 70–90%, making your website load instantly.

---

## Quick Setup (1 Minute)

### 1. Install Dependencies
Open your terminal and run:
```bash
pip3 install fonttools brotli
```

### 2. Protect a Single Font
```bash
python3 subset_fonts.py --input /path/to/MyMasterFont.otf --output /path/to/MyMasterFont.woff2
```

### 3. Protect a Whole Folder of Master Fonts in Batch
To convert all your master fonts directly into the website's preview font folder:
```bash
python3 subset_fonts.py --batch /path/to/master_fonts/ --outdir ../main-website/homepage-updated/fonts/
```

---

## Safe Workflow Overview
```
[Your Computer / Font Software (Glyphs/FontLab)]
              │
              ├── Master .otf / .ttf ──────► Saved in private 'commercial-vault/'
              │                                (Sent ONLY to paying buyers)
              │
              └── Run 'subset_fonts.py' ────► Output stripped .woff2
                                               (Placed in 'main-website/homepage-updated/fonts/')
                                               (Safe for public web preview)
```
