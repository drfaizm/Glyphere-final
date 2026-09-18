<?php
/**
 * Glyphere - Stripe Checkout Session Handler (PHP / Hostinger / LiteSpeed / Apache)
 * Creates a secure Stripe Checkout Session via Stripe's REST API using standard curl.
 * 
 * Location: backend/api/create-checkout-session.php
 * All keys stored privately in backend/.env or system environment variables.
 */

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

// 1. Resolve Stripe Secret Key securely (from Environment or backend/.env)
$secretKey = getenv('STRIPE_SECRET_KEY');
if (!$secretKey && isset($_ENV['STRIPE_SECRET_KEY'])) {
    $secretKey = $_ENV['STRIPE_SECRET_KEY'];
}
if (!$secretKey && isset($_SERVER['STRIPE_SECRET_KEY'])) {
    $secretKey = $_SERVER['STRIPE_SECRET_KEY'];
}

// Check backend/.env or root .env
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

// 2. Parse Incoming JSON payload
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || !isset($data['items']) || !is_array($data['items']) || empty($data['items'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Cart is empty. Please add items to checkout.']);
    exit();
}

$items = $data['items'];
$appliedDiscount = isset($data['appliedDiscount']) ? floatval($data['appliedDiscount']) : 0;
$couponCode = isset($data['couponCode']) ? trim($data['couponCode']) : '';

// 3. Determine site origin for redirects
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'glyphere.com';
$origin = $protocol . $host;

// If request came with an explicit Origin header
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    $origin = rtrim($_SERVER['HTTP_ORIGIN'], '/');
} elseif (!empty($_SERVER['HTTP_REFERER'])) {
    $parts = parse_url($_SERVER['HTTP_REFERER']);
    if (!empty($parts['scheme']) && !empty($parts['host'])) {
        $origin = $parts['scheme'] . '://' . $parts['host'] . (!empty($parts['port']) ? ':' . $parts['port'] : '');
    }
}

// 4. Determine base path (supports site deployed under /main-website/ or root)
$basePrefix = '';
if (!empty($_SERVER['HTTP_REFERER'])) {
    $refPath = parse_url($_SERVER['HTTP_REFERER'], PHP_URL_PATH);
    if ($refPath && strpos($refPath, '/main-website') === 0) {
        $basePrefix = '/main-website';
    }
}
if (empty($basePrefix) && !empty($_SERVER['SCRIPT_NAME']) && strpos($_SERVER['SCRIPT_NAME'], '/main-website') === 0) {
    $basePrefix = '/main-website';
}

// 5. Construct Stripe line items
$postFields = [
    'mode' => 'payment',
    'payment_method_types' => ['card'],
    'success_url' => $origin . $basePrefix . '/checkout-success.html?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => $origin . $basePrefix . '/cart.html',
    'line_items' => []
];

foreach ($items as $index => $item) {
    $rawName = $item['name'] ?? 'Glyphere Typeface';
    $cleanName = preg_replace('/(\s*\((Desktop|Web|Commercial)(\s+License)?\))+/i', '', $rawName);
    $cleanName = trim($cleanName);
    $license = !empty($item['license']) ? $item['license'] : 'Desktop License';
    $price = floatval($item['price'] ?? 0);
    $unitAmount = max(50, round($price * 100)); // Minimum $0.50 in cents
    $qty = max(1, intval($item['qty'] ?? 1));

    $lineItem = [
        'price_data' => [
            'currency' => 'usd',
            'unit_amount' => $unitAmount,
            'product_data' => [
                'name' => $cleanName . ' — ' . (strpos($license, 'License') !== false ? $license : $license . ' License'),
                'description' => 'Glyphere Bespoke Digital Typeface (' . $license . ')',
                'metadata' => [
                    'fontId' => strval($item['id'] ?? ''),
                    'license' => $license,
                ]
            ]
        ],
        'quantity' => $qty
    ];

    if (!empty($item['image']) && is_string($item['image']) && strpos($item['image'], 'http') === 0) {
        $lineItem['price_data']['product_data']['images'] = [$item['image']];
    }

    $postFields['line_items'][$index] = $lineItem;
}

// 6. Handle Discounts & Promotion Codes
if ($appliedDiscount > 0) {
    $percent = min(100, round($appliedDiscount * 100));
    
    // Create ephemeral coupon in Stripe
    $chC = curl_init('https://api.stripe.com/v1/coupons');
    curl_setopt($chC, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chC, CURLOPT_POST, true);
    curl_setopt($chC, CURLOPT_POSTFIELDS, http_build_query([
        'percent_off' => $percent,
        'duration' => 'once',
        'name' => !empty($couponCode) ? 'Coupon (' . $couponCode . ')' : $percent . '% Cart Discount'
    ]));
    curl_setopt($chC, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $secretKey,
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    $couponRes = curl_exec($chC);
    curl_close($chC);
    $couponData = json_decode($couponRes, true);

    if (!empty($couponData['id'])) {
        $postFields['discounts'] = [['coupon' => $couponData['id']]];
    }
} else {
    $postFields['allow_promotion_codes'] = 'true';
}

// 7. Create Stripe Checkout Session via cURL
$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $secretKey,
    'Content-Type: application/x-www-form-urlencoded'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL Error: ' . $curlError]);
    exit();
}

$session = json_decode($response, true);
if ($httpCode >= 400 || empty($session['url'])) {
    http_response_code($httpCode ?: 500);
    $errorMsg = $session['error']['message'] ?? 'Failed to initialize checkout session with Stripe.';
    echo json_encode(['error' => $errorMsg]);
    exit();
}

// Success
http_response_code(200);
echo json_encode([
    'url' => $session['url'],
    'sessionId' => $session['id']
]);
