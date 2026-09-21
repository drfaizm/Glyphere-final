<?php
/**
 * Glyphere - Secure Font Package Download Handler (PHP / Hostinger)
 * 
 * Verifies that the given Stripe session_id has payment_status === 'paid',
 * validates security token, checks 24h expiration, and enforces maximum download quotas.
 * Location: backend/api/download-font.php
 * All keys stored privately in backend/.env or system environment variables.
 */

require_once __DIR__ . '/downloads-tracker.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Order-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$sessionId = $_GET['session_id'] ?? '';
$requestedFont = $_GET['font'] ?? '';
$isAll = isset($_GET['all']) && $_GET['all'] == '1';
$token = $_GET['token'] ?? ($_SERVER['HTTP_X_ORDER_TOKEN'] ?? '');
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? '');

if (empty($sessionId)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing session_id parameter']);
    exit();
}

// Strictly block demo/test from downloading real commercial font packages
if ($sessionId === 'demo' || $sessionId === 'test') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Demo font downloads are disabled. A verified commercial license purchase is required.']);
    exit();
}

// Locate packages directory in backend/commercial-vault/packages
$possibleDirs = [
    __DIR__ . '/../commercial-vault/packages',
    dirname(__DIR__) . '/commercial-vault/packages',
    dirname(__DIR__, 2) . '/backend/commercial-vault/packages',
    __DIR__ . '/commercial-vault/packages',
];

$packagesDir = null;
foreach ($possibleDirs as $dir) {
    if (is_dir($dir)) {
        $packagesDir = $dir;
        break;
    }
}

if (!$packagesDir) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Packages repository not found on server']);
    exit();
}

// Load manifest
$manifestPath = $packagesDir . '/manifest.json';
$manifest = [];
if (file_exists($manifestPath)) {
    $manifest = json_decode(file_get_contents($manifestPath), true) ?: [];
}

// Helper to slugify
function slugify($str) {
    $str = preg_replace('/^\d+[\.\s]+/', '', (string)$str);
    $str = preg_replace('/—.*$/', '', $str);
    $str = preg_replace('/\s*\(.*?\)/', '', $str);
    $str = preg_replace('/[^a-zA-Z0-9]+/', '-', strtolower($str));
    return trim($str, '-');
}

// Match slug to manifest
function matchSlug($slug, $manifest) {
    if (isset($manifest[$slug])) return $slug;
    $clean = preg_replace('/[^a-z0-9]/', '', $slug);
    foreach ($manifest as $key => $val) {
        $keyClean = preg_replace('/[^a-z0-9]/', '', $key);
        if ($keyClean === $clean || strpos($keyClean, $clean) !== false || strpos($clean, $keyClean) !== false) {
            return $key;
        }
    }
    return null;
}

// Resolve Stripe Secret Key securely
$secretKey = getenv('STRIPE_SECRET_KEY');
if (!$secretKey && isset($_ENV['STRIPE_SECRET_KEY'])) {
    $secretKey = $_ENV['STRIPE_SECRET_KEY'];
}
if (!$secretKey && isset($_SERVER['STRIPE_SECRET_KEY'])) {
    $secretKey = $_SERVER['STRIPE_SECRET_KEY'];
}

$possibleEnvFiles = [
    __DIR__ . '/../.env',
    dirname(__DIR__) . '/.env',
    dirname(__DIR__, 2) . '/.env',
    dirname(__DIR__, 2) . '/backend/.env'
];

if (!$secretKey) {
    foreach ($possibleEnvFiles as $envFile) {
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    if (trim($k) === 'STRIPE_SECRET_KEY') {
                        $secretKey = trim($v);
                        break 2;
                    }
                }
            }
        }
    }
}

if (!$secretKey) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Stripe configuration error: STRIPE_SECRET_KEY is not defined in server environment.']);
    exit();
}

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions/' . urlencode($sessionId) . '?expand[]=line_items&expand[]=customer_details');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $secretKey]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$session = json_decode($response, true);
if ($httpCode >= 400 || empty($session['id'])) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid or unverified Stripe session']);
    exit();
}

if (($session['payment_status'] ?? '') !== 'paid') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Payment has not been completed']);
    exit();
}

$authorizedFonts = [];
if (!empty($session['line_items']['data'])) {
    foreach ($session['line_items']['data'] as $li) {
        $desc = $li['description'] ?? '';
        $authorizedFonts[] = slugify($desc);
    }
}

// Track session in registry
glyphere_get_or_init_session($sessionId, $session);

// Validate font package readiness before burning quota
$targetFile = null;
$downloadName = null;
$autoDelete = false;

if ($isAll || $requestedFont === 'all') {
    if (count($authorizedFonts) === 1) {
        $matched = matchSlug($authorizedFonts[0], $manifest);
        if ($matched && isset($manifest[$matched])) {
            $targetFile = $packagesDir . '/' . $manifest[$matched]['zipName'];
            $downloadName = str_replace(' ', '_', $manifest[$matched]['displayName']) . '_Glyphere_Package.zip';
        }
    } elseif (class_exists('ZipArchive') && count($authorizedFonts) > 0) {
        $bundleName = 'Glyphere_Order_' . substr($sessionId, -8) . '.zip';
        $bundlePath = $packagesDir . '/' . $bundleName;

        $zip = new ZipArchive();
        if ($zip->open($bundlePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            foreach ($authorizedFonts as $authFont) {
                $matched = matchSlug($authFont, $manifest);
                if ($matched && isset($manifest[$matched])) {
                    $pkgFile = $packagesDir . '/' . $manifest[$matched]['zipName'];
                    if (file_exists($pkgFile)) {
                        $zip->addFile($pkgFile, $manifest[$matched]['zipName']);
                    }
                }
            }
            $zip->close();

            if (file_exists($bundlePath)) {
                $targetFile = $bundlePath;
                $downloadName = $bundleName;
                $autoDelete = true;
            }
        }
    }
} else {
    // Single Font Download
    $slug = slugify($requestedFont);
    $matched = matchSlug($slug, $manifest);

    if (!$matched || !isset($manifest[$matched])) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => "Font package for '{$requestedFont}' not found"]);
        exit();
    }

    $authorized = false;
    foreach ($authorizedFonts as $af) {
        if ($af === $matched || strpos($matched, $af) !== false || strpos($af, $matched) !== false) {
            $authorized = true;
            break;
        }
    }
    if (!$authorized) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => "Font '{$requestedFont}' was not included in this purchase"]);
        exit();
    }

    $zipFile = $packagesDir . '/' . $manifest[$matched]['zipName'];
    if (!file_exists($zipFile)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Font package file missing on server']);
        exit();
    }

    $targetFile = $zipFile;
    $downloadName = str_replace(' ', '_', $manifest[$matched]['displayName']) . '_Glyphere_Package.zip';
}

if (!$targetFile || !file_exists($targetFile)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Font package file missing or bundle generation failed.']);
    exit();
}

// Verify Quota & Token, and Record Download
$result = glyphere_record_download($sessionId, $token, $isAll ? 'ALL_FONTS' : $requestedFont, $clientIp);
if (empty($result['allowed'])) {
    if ($autoDelete && file_exists($targetFile)) {
        @unlink($targetFile);
    }
    http_response_code($result['status'] ?? 403);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $result['error'] ?? 'Download not permitted.',
        'limit_reached' => isset($result['status']) && $result['status'] === 403 && strpos($result['error'] ?? '', 'limit reached') !== false
    ]);
    exit();
}

header('X-Downloads-Remaining: ' . (int)($result['downloadsRemaining'] ?? 0));
streamFile($targetFile, $downloadName, $autoDelete);

function streamFile($filePath, $downloadName, $deleteAfter = false) {
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $downloadName . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');

    readfile($filePath);
    if ($deleteAfter) {
        @unlink($filePath);
    }
    exit();
}
