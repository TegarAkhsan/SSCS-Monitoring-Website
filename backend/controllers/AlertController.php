<?php
// ============================================================
// Controller: Alert
// ============================================================
require_once __DIR__ . '/../models/Alert.php';
require_once __DIR__ . '/../models/Ship.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AlertController {
    private Alert $alertModel;
    private Ship  $shipModel;

    public function __construct() {
        $this->alertModel = new Alert();
        $this->shipModel  = new Ship();
    }

    // GET /api/alerts
    public function index(): void {
        AuthMiddleware::require();
        $active   = $this->alertModel->getActive();
        $resolved = $this->alertModel->getResolved(50);
        $counts   = $this->alertModel->getCountsByStatus();

        echo json_encode([
            'success'  => true,
            'active'   => $active,
            'resolved' => $resolved,
            'counts'   => $counts,
        ]);
    }

    // GET /api/alerts/{id}
    public function show(string $id): void {
        AuthMiddleware::require();
        $alert = $this->alertModel->findById($id);
        if (!$alert) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Alert tidak ditemukan.']);
            return;
        }
        echo json_encode(['success' => true, 'data' => $alert]);
    }

    // PUT /api/alerts/{id}/resolve
    public function resolve(string $id): void {
        AuthMiddleware::require();
        $alert = $this->alertModel->findById($id);
        if (!$alert) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Alert tidak ditemukan.']);
            return;
        }
        if ($alert['status'] === 'Resolved') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Alert sudah di-resolve.']);
            return;
        }

        $resolvedAt = date('d/m/Y H:i:s');
        $this->alertModel->resolve($id, $resolvedAt, 'Diselesaikan oleh operator.');
        echo json_encode(['success' => true, 'message' => 'Alert ' . $id . ' berhasil di-resolve.']);
    }
}
