<?php
/**
 * Glyphere Frontend Bridge - Create Checkout Session
 * Zero secret keys stored here. Delegates to private backend handler.
 */
$backendCandidates = [
    dirname(__DIR__, 2) . '/backend/api/create-checkout-session.php',
    dirname(__DIR__) . '/../backend/api/create-checkout-session.php',
    __DIR__ . '/../../backend/api/create-checkout-session.php',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/../backend/api/create-checkout-session.php',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/backend/api/create-checkout-session.php'
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
