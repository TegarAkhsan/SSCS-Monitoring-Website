<?php
// ============================================================
// Controller: History
// ============================================================
require_once __DIR__ . '/../models/History.php';
require_once __DIR__ . '/../models/Ship.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class HistoryController {
    private History $historyModel;
    private Ship    $shipModel;

    public function __construct() {
        $this->historyModel = new History();
        $this->shipModel    = new Ship();
    }

    // GET /api/history
    public function index(): void {
        AuthMiddleware::require();
        $dateFilter = $_GET['date'] ?? '';
        $imoFilter  = $_GET['imo']  ?? '';

        $history = $this->historyModel->getAll($dateFilter, $imoFilter);
        $active  = $this->historyModel->getActiveSessions();
        $summary = $this->historyModel->getSummary($dateFilter, $imoFilter);

        // Enrich active sessions with end_time label
        foreach ($active as &$sess) {
            $sess['end_time'] = 'Sedang Berjalan';
        }
        unset($sess);

        echo json_encode([
            'success'  => true,
            'history'  => $history,
            'active'   => $active,
            'summary'  => $summary,
        ]);
    }
}
