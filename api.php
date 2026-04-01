<?php
/**
 * ТОМЕДА ОФЕРТА - API (cPanel / PHP)
 * Handles offer number persistence and history log.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('OFFER_FILE',   __DIR__ . '/offerNumber.json');
define('HISTORY_FILE', __DIR__ . '/offers-history.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function readOfferNumber(): int {
    if (!file_exists(OFFER_FILE)) {
        saveOfferNumber(1521);
        return 1521;
    }
    $data = json_decode(file_get_contents(OFFER_FILE), true);
    return (int)($data['offerNumber'] ?? 1521);
}

function saveOfferNumber(int $num): void {
    file_put_contents(OFFER_FILE, json_encode(['offerNumber' => $num], JSON_PRETTY_PRINT));
}

function appendHistory(array $entry): void {
    $history = [];
    if (file_exists(HISTORY_FILE)) {
        $history = json_decode(file_get_contents(HISTORY_FILE), true) ?? [];
    }
    $history[] = $entry;
    file_put_contents(HISTORY_FILE, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// ── Router ────────────────────────────────────────────────────────────────────

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// GET /api.php?action=offerNumber
if ($method === 'GET' && $action === 'offerNumber') {
    echo json_encode(['offerNumber' => readOfferNumber()]);
    exit;
}

// GET /api.php?action=history
if ($method === 'GET' && $action === 'history') {
    $history = [];
    if (file_exists(HISTORY_FILE)) {
        $history = json_decode(file_get_contents(HISTORY_FILE), true) ?? [];
    }
    echo json_encode($history);
    exit;
}

// POST /api.php?action=incrementOffer
if ($method === 'POST' && $action === 'incrementOffer') {
    $previous = readOfferNumber();
    $next = $previous + 1;
    saveOfferNumber($next);
    appendHistory([
        'offerNumber'   => $previous,
        'incrementedAt' => date('c')
    ]);
    echo json_encode(['success' => true, 'previous' => $previous, 'next' => $next]);
    exit;
}

// POST /api.php?action=logOffer  (called after PDF is saved)
if ($method === 'POST' && $action === 'logOffer') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    appendHistory([
        'offerNumber' => $body['offerNumber'] ?? null,
        'clientName'  => $body['clientName']  ?? '—',
        'loggedAt'    => date('c')
    ]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Unknown action']);
