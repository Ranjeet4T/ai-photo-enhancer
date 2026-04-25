<?php
// ============================================
// SMS BOMBER WEB - CONFIGURATION FILE
// ============================================

// Database configuration (SQLite)
define('DB_PATH', __DIR__ . '/database/stats.db');

// API rate limiting
define('MAX_REQUESTS_PER_IP', 50);      // Max requests per IP per hour
define('MAX_MESSAGES_PER_TARGET', 500);  // Max messages per target number

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0);  // Set to 1 if using HTTPS

// Timezone
date_default_timezone_set('Asia/Kolkata');

// Logging
define('LOG_ENABLED', true);
define('LOG_PATH', __DIR__ . '/logs/');

// Create necessary directories
if (!file_exists(LOG_PATH)) {
    mkdir(LOG_PATH, 0755, true);
}
if (!file_exists(dirname(DB_PATH))) {
    mkdir(dirname(DB_PATH), 0755, true);
}

// Initialize SQLite database
function initDatabase() {
    $db = new SQLite3(DB_PATH);
    
    // Create stats table
    $db->exec("CREATE TABLE IF NOT EXISTS bombing_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_phone TEXT,
        messages_sent INTEGER,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $db->exec("CREATE TABLE IF NOT EXISTS rate_limit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        request_count INTEGER,
        last_request DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $db->close();
}

// Call on file load
initDatabase();
?>
