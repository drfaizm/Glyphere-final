<?php
/**
 * Glyphere Frontend Bridge - Get Checkout Session
 * Zero secret keys stored here. Delegates to private backend handler.
 */
$backendCandidates = [
    dirname(__DIR__, 3) . '/backend/api/get-checkout-session.php',
    dirname(__DIR__, 2) . '/backend/api/get-checkout-session.php',
    __DIR__ . '/../../../backend/api/get-checkout-session.php',
    __DIR__ . '/../../backend/api/get-checkout-session.php',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/../backend/api/get-checkout-session.php',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/backend/api/get-checkout-session.php'
];

foreach ($backendCandidates as $file) {
    if (!empty($file) && file_exists($file)) {
        require $file;
        exit();
    }
}

http_response_code(500);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['error' => 'Backend service unreachable. Please ensure the backend/ directory is installed on the server.']);
