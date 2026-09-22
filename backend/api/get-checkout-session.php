<?php
/**
 * Glyphere - Retrieve Stripe Checkout Session Details (PHP / Hostinger)
 * Enforces download quotas (max 3), 24h expiration, and email device verification.
 * Location: backend/api/get-checkout-session.php
 * All keys stored privately in backend/.env or system environment variables.
 */

require_once __DIR__ . '/downloads-tracker.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Order-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents('php://input');
$bodyData = json_decode($rawInput, true) ?: [];

$sessionId = $_GET['session_id'] ?? ($bodyData['session_id'] ?? '');
$token = $_GET['token'] ?? ($bodyData['token'] ?? ($_SERVER['HTTP_X_ORDER_TOKEN'] ?? ''));
$verifyEmail = $_GET['verify_email'] ?? ($bodyData['verify_email'] ?? '');

if (empty($sessionId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing session_id parameter']);
    exit();
}

// Handle demo / test preview WITHOUT providing real download access
if ($sessionId === 'demo' || $sessionId === 'test') {
    echo json_encode([
        'id' => 'demo',
        'is_demo' => true,
        'is_locked' => false,
        'is_expired' => false,
        'is_exhausted' => false,
        'customer_email' => 'demo@glyphere.com',
        'customer_name' => 'Glyphere Previewer',
        'amount_total' => '120.00',
        'currency' => 'USD',
        'payment_status' => 'paid',
        'downloads_remaining' => 3,
        'max_downloads' => 3,
        'expires_at' => time() + (24 * 3600),
        'items' => [
            [
                'description' => 'Midnight Citadel — Desktop License',
                'font_name' => 'Midnight Citadel',
                'license_type' => 'Desktop License',
                'font_slug' => 'midnight-citadel',
                'download_url' => null,
                'amount_total' => '60.00',
                'quantity' => 1
            ],
            [
                'description' => 'Turbo Block — Desktop + Web License',
                'font_name' => 'Turbo Block',
                'license_type' => 'Desktop + Web License',
                'font_slug' => 'turbo-block',
                'download_url' => null,
                'amount_total' => '60.00',
                'quantity' => 1
            ]
        ],
        'download_all_url' => null,
        'created' => time()
    ]);
    exit();
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
                    list($name, $value) = explode('=', $line, 2);
                    if (trim($name) === 'STRIPE_SECRET_KEY') {
                        $secretKey = trim($value);
                        break 2;
                    }
                }
            }
        }
    }
}

if (!$secretKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Stripe configuration error: STRIPE_SECRET_KEY is not defined in server environment.']);
    exit();
}

$url = 'https://api.stripe.com/v1/checkout/sessions/' . urlencode($sessionId) . '?expand[]=line_items&expand[]=customer_details';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $secretKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$session = json_decode($response, true);
if ($httpCode >= 400 || empty($session['id'])) {
    http_response_code($httpCode ?: 500);
    $errorMsg = $session['error']['message'] ?? 'Failed to retrieve session details';
    echo json_encode(['error' => $errorMsg]);
    exit();
}

if (($session['payment_status'] ?? '') !== 'paid') {
    http_response_code(403);
    echo json_encode(['error' => 'Payment has not been completed for this checkout session.']);
    exit();
}

// Verify access via Tracker
$authResult = glyphere_verify_session_access($sessionId, $token, $verifyEmail, $session);

if (!empty($authResult['isExpired'])) {
    echo json_encode([
        'id' => $session['id'],
        'is_expired' => true,
        'is_locked' => false,
        'is_exhausted' => $authResult['isExhausted'] ?? false,
        'downloads_remaining' => 0,
        'max_downloads' => $authResult['maxDownloads'],
        'expires_at' => $authResult['expiresAt'],
        'error' => $authResult['error'] ?? 'This download link expired 24 hours after purchase.'
    ]);
    exit();
}

if (empty($authResult['authorized']) || !empty($authResult['isLocked'])) {
    echo json_encode([
        'id' => $session['id'],
        'is_locked' => true,
        'is_expired' => false,
        'is_exhausted' => $authResult['isExhausted'] ?? false,
        'masked_email' => $authResult['maskedEmail'],
        'customer_name' => 'Valued Typographer',
        'amount_total' => number_format(($session['amount_total'] ?? 0) / 100, 2, '.', ''),
        'currency' => strtoupper($session['currency'] ?? 'USD'),
        'payment_status' => $session['payment_status'] ?? 'paid',
        'downloads_remaining' => $authResult['downloadsRemaining'],
        'max_downloads' => $authResult['maxDownloads'],
        'expires_at' => $authResult['expiresAt'],
        'error' => $authResult['error'] ?? 'Security verification required: please confirm your billing email to unlock downloads on this device.'
    ]);
    exit();
}

// Authorized: Return items with signed token download URLs
$items = [];
if (!empty($session['line_items']['data'])) {
    foreach ($session['line_items']['data'] as $li) {
        $desc = $li['description'] ?? ($li['price']['product']['name'] ?? ($li['price']['nickname'] ?? 'Typeface License'));
        
        // Split on em-dash (—), en-dash (–), or spaced hyphen ( - )
        $parts = preg_split('/\s*[\x{2014}\x{2013}\-]\s*/u', $desc, 2);
        $fontName = trim($parts[0] ?? $desc);
        $license = trim($parts[1] ?? 'Commercial Authorization');
        if (stripos($license, 'license') === false && stripos($license, 'authorization') === false) {
            $license .= ' License';
        }

        $fontSlug = preg_replace('/^\d+[\.\s]+/', '', $fontName);
        $fontSlug = trim(preg_replace('/[^a-zA-Z0-9]+/', '-', strtolower($fontSlug)), '-');

        $items[] = [
            'description' => $desc,
            'font_name' => $fontName,
            'license_type' => $license,
            'font_slug' => $fontSlug,
            'download_url' => '/api/download-font.php?session_id=' . urlencode($session['id']) . '&font=' . urlencode($fontSlug) . '&token=' . urlencode($authResult['token']),
            'amount_total' => number_format(($li['amount_total'] ?? 0) / 100, 2, '.', ''),
            'quantity' => $li['quantity'] ?? 1
        ];
    }
}

// Fallback if line_items was somehow empty
if (empty($items)) {
    $fallbackName = $session['metadata']['fontName'] ?? ($session['metadata']['product_name'] ?? 'Glyphere Typeface');
    $fallbackSlug = preg_replace('/[^a-zA-Z0-9]+/', '-', strtolower($fallbackName));
    $fallbackSlug = trim($fallbackSlug, '-');
    $items[] = [
        'description' => $fallbackName . ' — Commercial License',
        'font_name' => $fallbackName,
        'license_type' => 'Commercial License',
        'font_slug' => $fallbackSlug ?: 'glyphere-typeface',
        'download_url' => '/api/download-font.php?session_id=' . urlencode($session['id']) . '&font=' . urlencode($fallbackSlug ?: 'glyphere-typeface') . '&token=' . urlencode($authResult['token']),
        'amount_total' => number_format(($session['amount_total'] ?? 0) / 100, 2, '.', ''),
        'quantity' => 1
    ];
}

echo json_encode([
    'id' => $session['id'],
    'is_locked' => false,
    'is_expired' => false,
    'is_exhausted' => $authResult['isExhausted'] ?? false,
    'token' => $authResult['token'],
    'customer_email' => $session['customer_details']['email'] ?? ($session['customer_email'] ?? 'Valued Customer'),
    'customer_name' => $session['customer_details']['name'] ?? 'Valued Typographer',
    'amount_total' => number_format(($session['amount_total'] ?? 0) / 100, 2, '.', ''),
    'currency' => strtoupper($session['currency'] ?? 'USD'),
    'payment_status' => $session['payment_status'] ?? 'paid',
    'downloads_remaining' => $authResult['downloadsRemaining'],
    'max_downloads' => $authResult['maxDownloads'],
    'expires_at' => $authResult['expiresAt'],
    'items' => array_values($items),
    'download_all_url' => '/api/download-font.php?session_id=' . urlencode($session['id']) . '&all=1&token=' . urlencode($authResult['token']),
    'created' => $session['created'] ?? time()
]);
