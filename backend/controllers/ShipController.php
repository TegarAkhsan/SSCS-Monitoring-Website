<?php
// ============================================================
// Controller: Ship
// ============================================================
require_once __DIR__ . '/../models/Ship.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ShipController {
    private Ship $shipModel;

    public function __construct() {
        $this->shipModel = new Ship();
    }

    // GET /api/ships
    public function index(): void {
        AuthMiddleware::require();
        $ships = $this->shipModel->getAll();
        echo json_encode(['success' => true, 'data' => $ships]);
    }

    // GET /api/ships/{imo}
    public function show(string $imo): void {
        AuthMiddleware::require();
        $ship = $this->shipModel->findByImo($imo);
        if (!$ship) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Kapal tidak ditemukan.']);
            return;
        }
        echo json_encode(['success' => true, 'data' => $ship]);
    }

    // POST /api/ships
    public function store(): void {
        AuthMiddleware::require();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($body['name']) || empty($body['imo'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name dan IMO wajib diisi.']);
            return;
        }

        // Check IMO uniqueness
        if ($this->shipModel->findByImo($body['imo'])) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'IMO sudah terdaftar.']);
            return;
        }

        $id = $this->shipModel->create($body);
        $ship = $this->shipModel->findById($id);
        http_response_code(201);
        echo json_encode(['success' => true, 'data' => $ship]);
    }

    // PUT /api/ships/{imo}/stop
    public function stop(string $imo): void {
        AuthMiddleware::require();
        $ship = $this->shipModel->findByImo($imo);
        if (!$ship) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Kapal tidak ditemukan.']);
            return;
        }

        $this->shipModel->stopShip((int) $ship['id']);
        echo json_encode(['success' => true, 'message' => 'Kapal ' . $ship['name'] . ' berhasil dihentikan.']);
    }
}
