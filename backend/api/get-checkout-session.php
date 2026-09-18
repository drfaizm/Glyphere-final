<?php
/**
 * Glyphere - Retrieve Stripe Checkout Session Details (PHP / Hostinger)
 * Location: backend/api/get-checkout-session.php
 * All keys stored privately in backend/.env or system environment variables.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$sessionId = $_GET['session_id'] ?? '';
if (empty($sessionId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing session_id parameter']);
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

$items = [];
if (!empty($session['line_items']['data'])) {
    foreach ($session['line_items']['data'] as $li) {
        $desc = $li['description'] ?? 'Typeface License';
        $parts = explode('—', $desc);
        $fontName = trim($parts[0] ?? $desc);
        $license = trim($parts[1] ?? 'Commercial Authorization');
        $fontSlug = preg_replace('/^\d+[\.\s]+/', '', $fontName);
        $fontSlug = trim(preg_replace('/[^a-zA-Z0-9]+/', '-', strtolower($fontSlug)), '-');

        $items[] = [
            'description' => $desc,
            'font_name' => $fontName,
            'license_type' => $license,
            'font_slug' => $fontSlug,
            'download_url' => '/api/download-font.php?session_id=' . urlencode($session['id']) . '&font=' . urlencode($fontSlug),
            'amount_total' => number_format(($li['amount_total'] ?? 0) / 100, 2, '.', ''),
            'quantity' => $li['quantity'] ?? 1
        ];
    }
}

echo json_encode([
    'id' => $session['id'],
    'customer_email' => $session['customer_details']['email'] ?? ($session['customer_email'] ?? 'Customer'),
    'customer_name' => $session['customer_details']['name'] ?? 'Valued Typographer',
    'amount_total' => number_format(($session['amount_total'] ?? 0) / 100, 2, '.', ''),
    'currency' => strtoupper($session['currency'] ?? 'USD'),
    'payment_status' => $session['payment_status'] ?? 'paid',
    'items' => $items,
    'download_all_url' => '/api/download-font.php?session_id=' . urlencode($session['id']) . '&all=1',
    'created' => $session['created'] ?? time()
]);
