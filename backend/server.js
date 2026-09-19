const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');
const fs = require('fs');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname, '../public_html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webp': 'image/webp',
  '.zip': 'application/zip'
};

// Polyfill express-like helpers for serverless functions
function enhanceResponse(res) {
  res.status = function (statusCode) {
    res.statusCode = statusCode;
    return res;
  };
  res.json = function (data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
    return res;
  };
  return res;
}

const createCheckoutHandler = require('./api/create-checkout-session');
const getCheckoutHandler = require('./api/get-checkout-session');
const downloadFontHandler = require('./api/download-font');

const server = http.createServer(async (req, res) => {
  enhanceResponse(res);
  const parsedUrl = url.parse(req.url, true);
  let pathname = '/';
  try {
    pathname = decodeURIComponent(parsedUrl.pathname || '/');
  } catch (e) {
    pathname = parsedUrl.pathname || '/';
  }

  // Normalize homepage aliases
  let cleanPath = pathname;
  if (cleanPath === '/' || cleanPath === '/homepage.html' || cleanPath === '/main-website/homepage.html' || cleanPath === '/index.html') {
    cleanPath = '/index.html';
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // 1. API Routes (support both root /api and /main-website/api prefixes)
  const isCreateCheckout = cleanPath === '/api/create-checkout-session' || cleanPath === '/api/create-checkout-session.php' ||
                           cleanPath === '/main-website/api/create-checkout-session' || cleanPath === '/main-website/api/create-checkout-session.php';
  if (isCreateCheckout) {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch (e) {
        req.body = {};
      }
      req.query = parsedUrl.query;
      try {
        await createCheckoutHandler(req, res);
      } catch (err) {
        console.error('API Error (create-checkout):', err);
        if (!res.writableEnded) {
          res.status(500).json({ error: err.message });
        }
      }
    });
    return;
  }

  const isGetCheckout = cleanPath === '/api/get-checkout-session' || cleanPath === '/api/get-checkout-session.php' ||
                        cleanPath === '/main-website/api/get-checkout-session' || cleanPath === '/main-website/api/get-checkout-session.php';
  if (isGetCheckout) {
    req.query = parsedUrl.query;
    try {
      await getCheckoutHandler(req, res);
    } catch (err) {
      console.error('API Error (get-checkout):', err);
      if (!res.writableEnded) {
        res.status(500).json({ error: err.message });
      }
    }
    return;
  }

  const isDownloadFont = cleanPath === '/api/download-font' || cleanPath === '/api/download-font.php' ||
                         cleanPath === '/main-website/api/download-font' || cleanPath === '/main-website/api/download-font.php';
  if (isDownloadFont) {
    req.query = parsedUrl.query;
    try {
      await downloadFontHandler(req, res);
    } catch (err) {
      console.error('API Error (download-font):', err);
      if (!res.writableEnded) {
        res.status(500).json({ error: err.message });
      }
    }
    return;
  }

  // 2. Protect sensitive files from static requests
  const lowerPath = cleanPath.toLowerCase();
  if (
    lowerPath.includes('.env') ||
    lowerPath.includes('.git') ||
    lowerPath.includes('commercial-vault') ||
    lowerPath.includes('backend') ||
    lowerPath.endsWith('.lock') ||
    lowerPath.endsWith('.json') && !lowerPath.includes('manifest')
  ) {
    res.status(404);
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>404 Not Found</h1>');
    return;
  }

  // 3. Static File Serving from public_html/
  let filePath = path.join(PUBLIC_DIR, cleanPath === '/' ? 'index.html' : cleanPath);

  // If path doesn't exist directly, check inside main-website/
  if (!fs.existsSync(filePath)) {
    const candidatePath = path.join(PUBLIC_DIR, 'main-website', cleanPath);
    if (fs.existsSync(candidatePath)) {
      filePath = candidatePath;
    }
  }

  // Prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.status(403);
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>403 Forbidden</h1>');
    return;
  }

  // If path doesn't have an extension and is not a dir, check if .html exists
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.status(404);
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>404 Not Found</h1><p>The requested file does not exist.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n✦ Glyphere Backend & Dev Server running at: http://localhost:${PORT}`);
  console.log(`  Frontend Root: ${PUBLIC_DIR}`);
  console.log(`  Homepage: http://localhost:${PORT}/`);
  console.log(`  Cart URL: http://localhost:${PORT}/main-website/cart.html`);
  console.log(`  Stripe API endpoint active: http://localhost:${PORT}/api/create-checkout-session\n`);
});
