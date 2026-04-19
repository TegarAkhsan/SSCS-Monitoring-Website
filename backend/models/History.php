<?php
// ============================================================
// Model: History (PSC Sessions)
// ============================================================
require_once __DIR__ . '/../config/database.php';

class History {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getAll(string $dateFilter = '', string $imoFilter = ''): array {
        $sql = "
            SELECT h.*, s.name AS ship, s.imo
            FROM history h
            JOIN ships s ON s.id = h.ship_id
            WHERE 1=1
        ";
        $params = [];

        if ($dateFilter) {
            $sql .= " AND h.date_only = ?";
            $params[] = $dateFilter;
        }
        if ($imoFilter) {
            $sql .= " AND s.imo = ?";
            $params[] = $imoFilter;
        }
        $sql .= " ORDER BY h.created_at DESC LIMIT 300";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get currently active (not yet disconnected) sessions.
     */
    public function getActiveSessions(): array {
        $sql = "
            SELECT h.*, s.name AS ship, s.imo
            FROM history h
            JOIN ships s ON s.id = h.ship_id
            WHERE h.end_time IS NULL AND h.status = 'Connected'
            ORDER BY h.created_at DESC
        ";
        return $this->db->query($sql)->fetchAll();
    }

    public function findActiveByShipId(int $shipId): ?array {
        $stmt = $this->db->prepare("
            SELECT * FROM history
            WHERE ship_id = ? AND end_time IS NULL AND status = 'Connected'
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$shipId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Start a new PSC session for a ship.
     */
    public function startSession(int $shipId): string {
        $id = 'PSC-' . time() . rand(10, 99);
        $now = date('d/m/Y H:i:s');
        $dateOnly = date('Y-m-d');

        $stmt = $this->db->prepare("
            INSERT INTO history (id, ship_id, start_time, date_only, energy, co2, status, operasi)
            VALUES (?, ?, ?, ?, 0, 0, 'Connected', 'On The Move')
        ");
        $stmt->execute([$id, $shipId, $now, $dateOnly]);
        return $id;
    }

    /**
     * Accumulate energy to an active session.
     */
    public function addEnergyToSession(string $sessionId, float $energy): void {
        $stmt = $this->db->prepare("
            UPDATE history
            SET energy = energy + ?,
                co2    = (energy + ?) * 0.0027
            WHERE id = ?
        ");
        $stmt->execute([$energy, $energy, $sessionId]);
    }

    /**
     * Close an active session (mark as Disconnected).
     */
    public function endSession(string $sessionId): void {
        $now = date('d/m/Y H:i:s');
        $stmt = $this->db->prepare("
            UPDATE history
            SET end_time = ?, status = 'Disconnected', operasi = 'Done'
            WHERE id = ?
        ");
        $stmt->execute([$now, $sessionId]);
    }

    public function getSummary(string $dateFilter = '', string $imoFilter = ''): array {
        $sql = "
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(h.energy), 0) AS total_energy,
                COALESCE(SUM(h.co2), 0)    AS total_co2
            FROM history h
            JOIN ships s ON s.id = h.ship_id
            WHERE 1=1
        ";
        $params = [];
        if ($dateFilter) { $sql .= " AND h.date_only = ?"; $params[] = $dateFilter; }
        if ($imoFilter)  { $sql .= " AND s.imo = ?";       $params[] = $imoFilter; }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }
}
