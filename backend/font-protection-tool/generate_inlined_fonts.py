#!/usr/bin/env python3
"""
Generates base64 inlined @font-face CSS definitions for all 27 Glyphere fonts.
Uses only Python built-in standard library (no pip packages needed).
"""

import os
import base64

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
FONTS_DIR = os.path.join(REPO_ROOT, "public_html", "assets", "fonts")
OUTPUT_CSS = os.path.join(REPO_ROOT, "public_html", "css", "fonts-base64.css")

MIME_TYPES = {
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/truetype"
}

FORMAT_NAMES = {
    ".woff2": "woff2",
    ".woff": "woff",
    ".ttf": "truetype"
}

def clean_family_name(filename):
    name = os.path.splitext(filename)[0]
    # Remove -Regular if present for clean family name matching
    return name

def main():
    if not os.path.exists(FONTS_DIR):
        print(f"Directory not found: {FONTS_DIR}")
        return

    files = sorted(os.listdir(FONTS_DIR))
    css_rules = [
        "/* ═══════════════════════════════════════════════════════════════════════",
        "   GLYPHERE — INLINED BASE64 TYPEFACES",
        "   Embedded directly in CSS to eliminate separate HTTP font downloads",
        "   and hide font files from the DevTools Sources 'Fonts' tree.",
        "   ═══════════════════════════════════════════════════════════════════════ */\n"
    ]

    count = 0
    for filename in files:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in MIME_TYPES:
            continue

        filepath = os.path.join(FONTS_DIR, filename)
        with open(filepath, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")

        mime = MIME_TYPES[ext]
        fmt = FORMAT_NAMES[ext]
        family_raw = os.path.splitext(filename)[0]
        family_spaced = family_raw.replace("_", " ").replace("-", " ")

        data_uri = f"data:{mime};charset=utf-8;base64,{encoded}"

        # We generate rules for both the underscore version and spaced version
        rule = f"""@font-face {{
  font-family: '{family_raw}';
  src: url('{data_uri}') format('{fmt}');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}}
@font-face {{
  font-family: '{family_spaced}';
  src: url('{data_uri}') format('{fmt}');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}}
"""
        css_rules.append(rule)
        count += 1
        print(f"Inlined: {filename} ({len(encoded)} chars)")

    with open(OUTPUT_CSS, "w", encoding="utf-8") as f:
        f.write("\n".join(css_rules))

    file_size_kb = os.path.getsize(OUTPUT_CSS) / 1024
    print(f"\nSuccessfully inlined {count} typefaces into {OUTPUT_CSS} ({file_size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
