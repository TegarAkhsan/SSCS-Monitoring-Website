<?php
// ============================================================
// Controller: Planning
// ============================================================
require_once __DIR__ . '/../models/Planning.php';
require_once __DIR__ . '/../models/Ship.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class PlanningController {
    private Planning $planningModel;
    private Ship     $shipModel;

    public function __construct() {
        $this->planningModel = new Planning();
        $this->shipModel     = new Ship();
    }

    // GET /api/planning
    public function index(): void {
        AuthMiddleware::require();
        $data = $this->planningModel->getAll('scheduled');
        echo json_encode(['success' => true, 'data' => $data]);
    }

    // POST /api/planning
    public function store(): void {
        AuthMiddleware::require();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $name     = trim($body['name']     ?? '');
        $dermaga  = trim($body['dermaga']  ?? '');
        $date     = trim($body['date']     ?? '');

        if (!$name || !$dermaga || !$date) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nama kapal, dermaga, dan ETA wajib diisi.']);
            return;
        }

        $id   = $this->planningModel->create([
            'name'     => $name,
            'dermaga'  => $dermaga,
            'date'     => $date,
            'etd'      => trim($body['etd']      ?? ''),
            'no_ppk'   => trim($body['no_ppk']   ?? ''),
            'no_prc'   => trim($body['no_prc']   ?? ''),
            'kegiatan' => trim($body['kegiatan'] ?? 'BONGKAR'),
            'grt'      => $body['grt']   !== '' ? (int)$body['grt']            : null,
            'loa'      => $body['loa']   !== '' ? (float)$body['loa']          : null,
        ]);
        $item = $this->planningModel->findById($id);
        http_response_code(201);
        echo json_encode(['success' => true, 'data' => $item]);
    }

    // PUT /api/planning/{id}
    public function update(int $id): void {
        AuthMiddleware::require();
        $plan = $this->planningModel->findById($id);
        if (!$plan) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Jadwal tidak ditemukan.']);
            return;
        }

        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $name    = trim($body['name']    ?? '');
        $dermaga = trim($body['dermaga'] ?? '');
        $date    = trim($body['date']    ?? '');

        if (!$name || !$dermaga || !$date) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nama kapal, dermaga, dan ETA wajib diisi.']);
            return;
        }

        $this->planningModel->update($id, [
            'name'     => $name,
            'dermaga'  => $dermaga,
            'date'     => $date,
            'etd'      => trim($body['etd']      ?? ''),
            'no_ppk'   => trim($body['no_ppk']   ?? ''),
            'no_prc'   => trim($body['no_prc']   ?? ''),
            'kegiatan' => trim($body['kegiatan'] ?? 'BONGKAR'),
            'grt'      => $body['grt']   !== '' ? (int)$body['grt']   : null,
            'loa'      => $body['loa']   !== '' ? (float)$body['loa'] : null,
        ]);

        $updated = $this->planningModel->findById($id);
        echo json_encode(['success' => true, 'data' => $updated]);
    }

    // DELETE /api/planning/{id}
    public function destroy(int $id): void {
        AuthMiddleware::require();
        $plan = $this->planningModel->findById($id);
        if (!$plan) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Jadwal tidak ditemukan.']);
            return;
        }
        $this->planningModel->delete($id);
        echo json_encode(['success' => true, 'message' => 'Jadwal berhasil dihapus.']);
    }

    // PUT /api/planning/{id}/run
    public function run(int $id): void {
        AuthMiddleware::require();
        $plan = $this->planningModel->findById($id);
        if (!$plan) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Jadwal tidak ditemukan.']);
            return;
        }

        // Generate new IMO dynamically
        $newImo = '7' . rand(100000, 999999);
        while ($this->shipModel->findByImo($newImo)) {
            $newImo = '7' . rand(100000, 999999);
        }

        $shipId = $this->shipModel->create([
            'name'     => $plan['name'],
            'type'     => 'General Cargo',
            'imo'      => $newImo,
            'no_ppk'   => $plan['no_ppk']   ?? null,
            'no_prc'   => $plan['no_prc']   ?? null,
            'kegiatan' => $plan['kegiatan'] ?? 'BONGKAR',
            'grt'      => $plan['grt']      ?? 0,
            'loa'      => $plan['loa']      ?? 0.00,
            'voyage'   => 'DALAMNEGERI',
        ]);

        $this->planningModel->markAsDone($id);

        $ship = $this->shipModel->findById($shipId);
        echo json_encode([
            'success' => true,
            'message' => 'Kapal ' . $plan['name'] . ' dipindahkan ke monitoring.',
            'ship'    => $ship,
        ]);
    }
}
