<?php
// ============================================================
// Controller: Simulation (Energy Tick — runs every 3s via polling)
// ============================================================
// The frontend calls GET /api/simulation/tick every 3 seconds.
// This controller runs one simulation tick for all active ships,
// persists the results, and returns the full updated state.
// ============================================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Ship.php';
require_once __DIR__ . '/../models/Alert.php';
require_once __DIR__ . '/../models/History.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class SimulationController {
    private PDO     $db;
    private Ship    $shipModel;
    private Alert   $alertModel;
    private History $historyModel;

    public function __construct() {
        $this->db           = Database::getInstance();
        $this->shipModel    = new Ship();
        $this->alertModel   = new Alert();
        $this->historyModel = new History();
    }

    // GET /api/simulation/tick
    public function tick(): void {
        AuthMiddleware::require();

        $activeShips = $this->shipModel->getActiveShips();

        $activeConnections   = 0;
        $globalRealtimeSum   = 0;
        $globalTotalEnergySum = 0;
        $monitoredCount      = 0;
        $newAlerts           = [];

        foreach ($activeShips as $ship) {
            $shipId    = (int) $ship['id'];
            $isStopped = (bool) $ship['is_stopped'];

            if ($isStopped) {
                $globalTotalEnergySum += (float) $ship['total_energy'];
                continue;
            }

            $monitoredCount++;
            $value     = rand(200, 249); // kW
            $connected = $value > 210;

            if ($connected) $activeConnections++;

            // Update state in DB
            $energyDelta = $connected ? $value : 0;
            $this->shipModel->updateState($shipId, $value, $energyDelta, $connected);

            // History session management
            $activeSession = $this->historyModel->findActiveByShipId($shipId);
            if ($connected) {
                if (!$activeSession) {
                    $this->historyModel->startSession($shipId);
                } else {
                    $this->historyModel->addEnergyToSession($activeSession['id'], $value);
                }
            } else {
                if ($activeSession) {
                    $this->historyModel->endSession($activeSession['id']);
                }
            }

            // Alert generation
            if ($value > 240) {
                $newAlert = $this->generateAlert($shipId, $value);
                if ($newAlert) $newAlerts[] = $newAlert;
            }

            $globalRealtimeSum    += $value;
            $globalTotalEnergySum += (float) $ship['total_energy'] + $energyDelta;
        }

        // Fetch full updated ship list for frontend
        $ships = $this->shipModel->getAll();

        echo json_encode([
            'success'            => true,
            'ships'              => $ships,
            'globalStats'        => [
                'activeConnections'   => $activeConnections,
                'monitoredCount'      => $monitoredCount,
                'globalRealtimeSum'   => $globalRealtimeSum,
                'globalTotalEnergy'   => $globalTotalEnergySum,
                'globalCO2'           => round($globalTotalEnergySum * 0.0027, 2),
            ],
            'newAlerts'          => $newAlerts,
        ]);
    }

    // POST /api/simulation/stop/{imo}
    public function stop(string $imo): void {
        AuthMiddleware::require();
        $ship = $this->shipModel->findByImo($imo);
        if (!$ship) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Kapal tidak ditemukan.']);
            return;
        }

        $this->shipModel->stopShip((int) $ship['id']);

        // End active session if any
        $session = $this->historyModel->findActiveByShipId((int) $ship['id']);
        if ($session) {
            $this->historyModel->endSession($session['id']);
        }

        // Resolve any active alerts for this ship
        $this->db->prepare("
            UPDATE alerts SET status='Resolved', resolved_at=?, deskripsi='Dimatikan paksa via Stop PSC.'
            WHERE ship_id=? AND status='Active'
        ")->execute([date('d/m/Y H:i:s'), $ship['id']]);

        echo json_encode(['success' => true, 'message' => 'PSC kapal ' . $ship['name'] . ' berhasil dihentikan.']);
    }

    // ---- Private helpers ----

    private function generateAlert(int $shipId, int $value): ?array {
        $level = '';
        $jenis = '';

        if ($value > 260) {
            $level = 'Critical';
            $types = ['Sistem PSC tidak bisa digunakan', 'Sistem monitoring error', 'Gangguan listrik besar'];
        } elseif ($value > 240) {
            $level = 'High';
            $types = ['Overload', 'Over Voltage', 'Under Voltage', 'Arus berlebih'];
        } elseif ($value > 230) {
            $level = 'Medium';
            $types = ['High Power Usage', 'Fluktuasi tegangan', 'Koneksi PSC tidak stabil'];
        } else {
            if (rand(1, 10) > 8) {
                $level = 'Low';
                $types = ['Fluktuasi daya kecil', 'Tegangan sedikit turun', 'Pemakaian energi meningkat'];
            } else {
                return null;
            }
        }

        // Avoid duplicate active alert of same level for same ship
        if ($this->alertModel->activeExistsForShipLevel($shipId, $level)) {
            return null;
        }

        $jenis = $types[array_rand($types)];
        $now   = date('d/m/Y H:i:s');

        $alertId = $this->alertModel->create([
            'ship_id'      => $shipId,
            'jenis'        => $jenis,
            'level'        => $level,
            'start_time_ms'=> round(microtime(true) * 1000),
            'waktu'        => $now,
        ]);

        // Return the newly created alert with ship info
        return $this->alertModel->findById($alertId);
    }
}
