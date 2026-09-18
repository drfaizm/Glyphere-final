#!/usr/bin/env python3
"""
Glyphere Font Protection & Web Subsetter
=========================================
Author: Glyphere Studio
Purpose: Creates crippled, lightweight "Web Preview" .woff2 fonts from master .otf/.ttf files.

Features:
1. Retains basic printable ASCII (A-Z, a-z, 0-9, basic punctuation) so web testers look great.
2. Strips GPOS (Kerning pairs) -> The downloaded font has no kerning in desktop design apps.
3. Strips GSUB (OpenType features) -> Discretionary ligatures, stylistic alternates, swashes are removed.
4. Drops Extended Latin, accented characters, and commercial symbols (©, ®, €, £, etc.).
5. Compresses into modern .woff2 format using Brotli.

Usage:
    # Single file:
    python3 subset_fonts.py --input master.otf --output preview.woff2

    # Batch process a whole directory:
    python3 subset_fonts.py --batch ./master-fonts --outdir ../main-website/homepage-updated/fonts/
"""

import sys
import os
import argparse

def check_dependencies():
    missing = []
    try:
        import fontTools
    except ImportError:
        missing.append("fonttools")
    try:
        import brotli
    except ImportError:
        missing.append("brotli")
    
    if missing:
        print("[!] Missing required python libraries:")
        print(f"    Please install them with: pip3 install {' '.join(missing)}")
        return False
    return True

def subset_font(input_path, output_path, keep_kerning=False, keep_ligatures=False):
    from fontTools import subset
    
    if not os.path.isfile(input_path):
        print(f"[-] Error: Input font '{input_path}' not found.")
        return False

    # Default character range: Basic printable ASCII (space U+0020 through tilde U+007E)
    # This covers: A-Z, a-z, 0-9, ! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ ` { | } ~
    unicodes = "U+0020-007E"
    
    # Tables to drop for theft protection
    drop_tables = []
    if not keep_kerning:
        drop_tables.append("GPOS")
        drop_tables.append("kern")
    if not keep_ligatures:
        drop_tables.append("GSUB")
        
    options = subset.Options()
    options.flavor = "woff2"
    options.drop_tables = drop_tables
    options.name_IDs = [0, 1, 2, 4, 6]  # Keep copyright, family, subfamily, full name, postscript name
    options.name_legacy = False
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = False
    options.recalc_bounds = True
    options.recalc_timestamp = True
    options.canonical_order = True

    args = [
        input_path,
        f"--unicodes={unicodes}",
        "--flavor=woff2",
        f"--output-file={output_path}"
    ]
    if drop_tables:
        args.append(f"--drop-tables={','.join(drop_tables)}")

    print(f"[*] Subsetting '{os.path.basename(input_path)}' -> '{os.path.basename(output_path)}'...")
    try:
        subset.main(args)
        in_size = os.path.getsize(input_path) / 1024
        out_size = os.path.getsize(output_path) / 1024
        print(f"[✓] Success! Original: {in_size:.1f} KB -> Protected Preview: {out_size:.1f} KB")
        return True
    except Exception as e:
        print(f"[-] Subsetting failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Glyphere Font Protection & Preview Subsetter")
    parser.add_argument("--input", "-i", help="Path to input master font (.otf or .ttf)")
    parser.add_argument("--output", "-o", help="Path to output preview .woff2 file")
    parser.add_argument("--batch", "-b", help="Directory containing master fonts to process in batch")
    parser.add_argument("--outdir", "-d", help="Directory where preview fonts will be saved (for batch mode)")
    parser.add_argument("--keep-kerning", action="store_true", help="Keep GPOS kerning tables (not recommended for anti-theft)")
    parser.add_argument("--keep-ligatures", action="store_true", help="Keep GSUB ligatures (not recommended for anti-theft)")

    args = parser.parse_args()

    if not check_dependencies():
        sys.exit(1)

    if args.batch:
        if not os.path.isdir(args.batch):
            print(f"[-] Directory '{args.batch}' does not exist.")
            sys.exit(1)
        outdir = args.outdir or args.batch
        os.makedirs(outdir, exist_ok=True)
        
        count = 0
        for filename in sorted(os.listdir(args.batch)):
            if filename.lower().endswith(('.otf', '.ttf')):
                base = os.path.splitext(filename)[0]
                in_path = os.path.join(args.batch, filename)
                out_path = os.path.join(outdir, f"{base}.woff2")
                if subset_font(in_path, out_path, args.keep_kerning, args.keep_ligatures):
                    count += 1
        print(f"\n[✓] Finished batch processing! {count} fonts protected and converted to preview .woff2.")
        
    elif args.input:
        output_file = args.output
        if not output_file:
            base = os.path.splitext(args.input)[0]
            output_file = f"{base}_preview.woff2"
        subset_font(args.input, output_file, args.keep_kerning, args.keep_ligatures)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
