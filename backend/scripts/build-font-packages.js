/**
 * Glyphere - Master Font Packaging Script
 * 
 * Scans 'Font Vault', extracts release font files (.otf, .ttf, .woff, .woff2),
 * bundles an official Glyphere Commercial EULA & Installation Guide,
 * and packages them into clean ZIP archives in 'commercial-vault/packages/'.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VAULT_DIR = fs.existsSync(path.resolve(__dirname, '..', '..', 'Font Vault'))
  ? path.resolve(__dirname, '..', '..', 'Font Vault')
  : path.resolve(__dirname, '..', 'Font Vault');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'commercial-vault', 'packages');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Standard EULA text
const EULA_TEXT = `========================================================================
GLYPHERE TYPE FOUNDRY — COMMERCIAL END USER LICENSE AGREEMENT (EULA)
========================================================================

Thank you for acquiring a typeface license from Glyphere Type Foundry.
Website: https://glyphere.com | Direct Studio: glyphere@gmail.com

1. GRANT OF LICENSE
Subject to the terms and payment of the applicable license fee, Glyphere grants
you a non-exclusive, perpetual, worldwide license to use the licensed font
software according to your selected tier:
  - DESKTOP LICENSE: Installation on authorized workstations for print, graphic design,
    advertising, branding, product packaging, and rasterized digital assets.
  - WEB FONT LICENSE: Self-hosting via @font-face on registered domains with monthly
    pageview quotas according to your tier.
  - COMMERCIAL / BROADCAST / APP: Extended use in commercial software, mobile apps,
    video broadcasting, cinematic streaming, and digital publications.

2. RESTRICTIONS
  - You may NOT resell, sub-license, distribute, modify, reverse-engineer, decompile,
    or redistribute the font software files to any third party.
  - You may NOT convert or rename the font software files for public redistribution.
  - Embedding in publicly editable templates (e.g. Canva / template marketplaces) requires
    an Enterprise Addendum from Glyphere.

3. INTELLECTUAL PROPERTY
The design, geometry, glyph outlines, and trademarks associated with this typeface
are the exclusive intellectual property of Glyphere and its contributing typographers.

4. WARRANTY & SUPPORT
Glyphere warrants that the font software performs in all standard operating systems
and design applications. For technical inquiries, custom glyph expansions, or enterprise
invoicing, reach our studio directly:
Email: glyphere@gmail.com
Website: https://glyphere.com
========================================================================
`;

// Installation Guide text
const GUIDE_TEXT = `========================================================================
GLYPHERE — QUICK FONT INSTALLATION & WEB INTEGRATION GUIDE
========================================================================

1. INSTALLING ON MACOS
  - Unzip this archive.
  - Double-click the .otf or .ttf file.
  - In the font preview window that appears, click "Install Font".
  - The font is immediately available in Adobe Creative Cloud, Figma, Canva, Apple Pages,
    Keynote, and Microsoft Office.

2. INSTALLING ON WINDOWS
  - Unzip this archive.
  - Right-click the .otf or .ttf file and choose "Install for all users" (or "Install").
  - Restart any open design software to refresh your font list.

3. USING WEB FONTS (.WOFF2 / .WOFF)
  - Upload the .woff2 and/or .woff files to your web server (e.g. /fonts/).
  - Add the following CSS declaration to your stylesheet:

    @font-face {
      font-family: 'YourFontName';
      src: url('/fonts/YourFont.woff2') format('woff2'),
           url('/fonts/YourFont.woff') format('woff');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }

    body {
      font-family: 'YourFontName', sans-serif;
    }

4. NEED ASSISTANCE?
  Reach out to Glyphere Studio: glyphere@gmail.com
========================================================================
`;

// Clean font slug generator
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/^\d+[\.\s]+/, '') // remove leading numbers like '11. ' or '2 '
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Clean display name
function cleanName(folderName) {
  return folderName.replace(/^\d+[\.\s]+/, '').trim();
}

console.log('✦ Scanning Font Vault at:', VAULT_DIR);
const entries = fs.readdirSync(VAULT_DIR, { withFileTypes: true });

const manifest = {};
let count = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;

  const folderName = entry.name;
  const folderPath = path.join(VAULT_DIR, folderName);
  const displayName = cleanName(folderName);
  const slug = slugify(folderName);

  const files = fs.readdirSync(folderPath);
  const fontFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return !f.startsWith('.') && ['.otf', '.ttf', '.woff', '.woff2'].includes(ext);
  });

  if (fontFiles.length === 0) {
    console.warn(`⚠️ Warning: No valid font files found in ${folderName}`);
    continue;
  }

  // Create temporary staging directory for the zip
  const tempDir = path.join(OUTPUT_DIR, `temp_${slug}`);
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Copy font files
  for (const f of fontFiles) {
    fs.copyFileSync(path.join(folderPath, f), path.join(tempDir, f));
  }

  // Write EULA & Guide
  fs.writeFileSync(path.join(tempDir, 'GLYPHERE_COMMERCIAL_EULA.txt'), EULA_TEXT, 'utf-8');
  fs.writeFileSync(path.join(tempDir, 'FONT_INSTALLATION_GUIDE.txt'), GUIDE_TEXT, 'utf-8');

  // Zip the directory contents
  const zipName = `${slug}-glyphere-package.zip`;
  const zipPath = path.join(OUTPUT_DIR, zipName);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  try {
    execSync(`cd "${tempDir}" && zip -q -r "${zipPath}" ./*`);
  } catch (err) {
    console.error(`Failed to zip ${slug}:`, err.message);
  } finally {
    // Clean up temporary folder
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const stat = fs.statSync(zipPath);
  manifest[slug] = {
    displayName,
    folderName,
    zipName,
    sizeBytes: stat.size,
    formats: fontFiles.map(f => path.extname(f).replace('.', '').toUpperCase()),
    fontFiles
  };

  count++;
  console.log(`  ✓ Packaged [${displayName}] -> ${zipName} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// Write manifest file
const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(`\n✦ Successfully created ${count} font packages in:\n  ${OUTPUT_DIR}`);
console.log(`✦ Manifest saved to:\n  ${manifestPath}\n`);
