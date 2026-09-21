<?php
/**
 * Glyphere - Order Download Limit & Access Tracker (PHP / Hostinger)
 * Enforces download quotas (max 3), 24h expiration, and email device authorization.
 * Location: backend/api/downloads-tracker.php
 */

define('GLYPHERE_MAX_DOWNLOADS', (int)(getenv('MAX_DOWNLOADS') ?: 3));
define('GLYPHERE_EXPIRY_HOURS', (int)(getenv('DOWNLOAD_EXPIRY_HOURS') ?: 24));
define('GLYPHERE_INITIAL_GRACE_PERIOD', 180); // 3 minutes grace for initial redirect

function glyphere_get_registry_path() {
    $candidates = [
        dirname(__DIR__) . '/data',
        dirname(__DIR__, 2) . '/backend/data',
        dirname(__DIR__, 2) . '/data',
        (__DIR__ . '/../data')
    ];

    foreach ($candidates as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        if (is_dir($dir)) {
            return $dir . '/downloads_registry.json';
        }
    }
    return dirname(__DIR__) . '/data/downloads_registry.json';
}

function glyphere_read_registry() {
    $path = glyphere_get_registry_path();
    if (!file_exists($path)) {
        return [];
    }
    $content = @file_get_contents($path);
    if (!$content) return [];
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function glyphere_write_registry($data) {
    $path = glyphere_get_registry_path();
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
}

function glyphere_mask_email($email) {
    if (empty($email) || strpos($email, '@') === false) {
        return '***@***.com';
    }
    list($local, $domain) = explode('@', $email, 2);
    $len = strlen($local);
    if ($len <= 2) {
        $maskedLocal = substr($local, 0, 1) . '*';
    } else {
        $maskedLocal = substr($local, 0, 1) . str_repeat('*', min(5, $len - 2)) . substr($local, -1);
    }

    $domainParts = explode('.', $domain);
    $domainName = $domainParts[0];
    $dLen = strlen($domainName);
    $maskedDomain = ($dLen <= 2) ? (substr($domainName, 0, 1) . '*') : (substr($domainName, 0, 1) . '***' . ($dLen > 4 ? substr($domainName, -1) : ''));
    array_shift($domainParts);
    $tld = implode('.', $domainParts);
    return $maskedLocal . '@' . $maskedDomain . '.' . ($tld ?: 'com');
}

/**
 * Retrieve or initialize tracker record for a session
 */
function glyphere_get_or_init_session($sessionId, $sessionData = []) {
    $registry = glyphere_read_registry();
    $now = time();

    if (!isset($registry[$sessionId])) {
        $created = !empty($sessionData['created']) ? (int)$sessionData['created'] : $now;
        $customerEmail = strtolower(trim($sessionData['customer_details']['email'] ?? ($sessionData['customer_email'] ?? '')));
        $token = bin2hex(random_bytes(32));

        $registry[$sessionId] = [
            'sessionId' => $sessionId,
            'createdAt' => $created,
            'expiresAt' => $created + (GLYPHERE_EXPIRY_HOURS * 3600),
            'customerEmail' => $customerEmail,
            'downloadCount' => 0,
            'maxDownloads' => GLYPHERE_MAX_DOWNLOADS,
            'token' => $token,
            'downloads' => [],
            'verifiedEmails' => $customerEmail ? [$customerEmail] : []
        ];
        glyphere_write_registry($registry);
    } else {
        $email = strtolower(trim($sessionData['customer_details']['email'] ?? ($sessionData['customer_email'] ?? '')));
        if (!empty($email) && empty($registry[$sessionId]['customerEmail'])) {
            $registry[$sessionId]['customerEmail'] = $email;
            glyphere_write_registry($registry);
        }
    }

    return $registry[$sessionId];
}

/**
 * Verify session access and return auth status
 */
function glyphere_verify_session_access($sessionId, $providedToken = '', $verifyEmail = '', $sessionData = []) {
    $record = glyphere_get_or_init_session($sessionId, $sessionData);
    $now = time();

    $isExpired = $now > $record['expiresAt'];
    $isExhausted = $record['downloadCount'] >= $record['maxDownloads'];
    $downloadsRemaining = max(0, $record['maxDownloads'] - $record['downloadCount']);
    $maskedEmail = glyphere_mask_email($record['customerEmail']);

    if ($isExpired) {
        return [
            'authorized' => false,
            'isExpired' => true,
            'isExhausted' => $isExhausted,
            'downloadsRemaining' => 0,
            'maxDownloads' => $record['maxDownloads'],
            'expiresAt' => $record['expiresAt'],
            'maskedEmail' => $maskedEmail,
            'error' => 'This download link has expired (valid for 24 hours after purchase).'
        ];
    }

    // Check 1: Token matches
    if (!empty($providedToken) && $providedToken === $record['token']) {
        return [
            'authorized' => true,
            'isExpired' => false,
            'isExhausted' => $isExhausted,
            'downloadsRemaining' => $downloadsRemaining,
            'maxDownloads' => $record['maxDownloads'],
            'expiresAt' => $record['expiresAt'],
            'maskedEmail' => $maskedEmail,
            'token' => $record['token']
        ];
    }

    // Check 2: Email verification attempted
    if (!empty($verifyEmail)) {
        $normalized = strtolower(trim($verifyEmail));
        if (!empty($record['customerEmail']) && $normalized === $record['customerEmail']) {
            return [
                'authorized' => true,
                'isExpired' => false,
                'isExhausted' => $isExhausted,
                'downloadsRemaining' => $downloadsRemaining,
                'maxDownloads' => $record['maxDownloads'],
                'expiresAt' => $record['expiresAt'],
                'maskedEmail' => $maskedEmail,
                'token' => $record['token'],
                'message' => 'Device verified successfully.'
            ];
        } else {
            return [
                'authorized' => false,
                'isLocked' => true,
                'isExpired' => false,
                'isExhausted' => $isExhausted,
                'downloadsRemaining' => $downloadsRemaining,
                'maxDownloads' => $record['maxDownloads'],
                'expiresAt' => $record['expiresAt'],
                'maskedEmail' => $maskedEmail,
                'error' => 'The email address entered does not match the purchaser records for this order.'
            ];
        }
    }

    // Check 3: Initial landing grace period
    $isInitialLanding = ($now - $record['createdAt']) <= GLYPHERE_INITIAL_GRACE_PERIOD && $record['downloadCount'] === 0;
    if ($isInitialLanding) {
        return [
            'authorized' => true,
            'isInitialLanding' => true,
            'isExpired' => false,
            'isExhausted' => $isExhausted,
            'downloadsRemaining' => $downloadsRemaining,
            'maxDownloads' => $record['maxDownloads'],
            'expiresAt' => $record['expiresAt'],
            'maskedEmail' => $maskedEmail,
            'token' => $record['token']
        ];
    }

    // Otherwise: Lock access and require email confirmation
    return [
        'authorized' => false,
        'isLocked' => true,
        'isExpired' => false,
        'isExhausted' => $isExhausted,
        'downloadsRemaining' => $downloadsRemaining,
        'maxDownloads' => $record['maxDownloads'],
        'expiresAt' => $record['expiresAt'],
        'maskedEmail' => $maskedEmail,
        'error' => 'Security verification required: please confirm your billing email to unlock downloads on this device.'
    ];
}

/**
 * Record font download
 */
function glyphere_record_download($sessionId, $providedToken = '', $fontSlug = '', $clientIp = '') {
    $registry = glyphere_read_registry();
    if (!isset($registry[$sessionId])) {
        return ['allowed' => false, 'status' => 404, 'error' => 'Order session not found in registry.'];
    }

    $record = &$registry[$sessionId];
    $now = time();

    if ($now > $record['expiresAt']) {
        return ['allowed' => false, 'status' => 403, 'error' => 'This download link expired 24 hours after purchase.'];
    }

    if (!empty($record['token']) && (empty($providedToken) || $providedToken !== $record['token'])) {
        return ['allowed' => false, 'status' => 403, 'error' => 'Unauthorized download request. Invalid or missing security token.'];
    }

    if ($record['downloadCount'] >= $record['maxDownloads']) {
        return [
            'allowed' => false,
            'status' => 403,
            'error' => "Download limit reached. You have completed the maximum allowed {$record['maxDownloads']} downloads for this purchase."
        ];
    }

    $record['downloadCount'] += 1;
    $record['downloads'][] = [
        'font' => $fontSlug,
        'time' => $now,
        'ip' => $clientIp ?: ($_SERVER['REMOTE_ADDR'] ?? '')
    ];

    glyphere_write_registry($registry);

    return [
        'allowed' => true,
        'downloadCount' => $record['downloadCount'],
        'maxDownloads' => $record['maxDownloads'],
        'downloadsRemaining' => max(0, $record['maxDownloads'] - $record['downloadCount'])
    ];
}
