<?php
// ============================================================
// Model: Alert
// ============================================================
require_once __DIR__ . '/../config/database.php';

class Alert {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getAll(): array {
        $sql = "
            SELECT a.*, s.name AS ship_name, s.imo
            FROM alerts a
            JOIN ships s ON s.id = a.ship_id
            ORDER BY a.created_at DESC
        ";
        return $this->db->query($sql)->fetchAll();
    }

    public function getActive(): array {
        $sql = "
            SELECT a.*, s.name AS ship, s.imo
            FROM alerts a
            JOIN ships s ON s.id = a.ship_id
            WHERE a.status = 'Active'
            ORDER BY a.created_at DESC
        ";
        return $this->db->query($sql)->fetchAll();
    }

    public function getResolved(int $limit = 50): array {
        $sql = "
            SELECT a.*, s.name AS ship, s.imo
            FROM alerts a
            JOIN ships s ON s.id = a.ship_id
            WHERE a.status = 'Resolved'
            ORDER BY a.created_at DESC
            LIMIT ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function findById(string $id): ?array {
        $sql = "
            SELECT a.*, s.name AS ship, s.imo
            FROM alerts a
            JOIN ships s ON s.id = a.ship_id
            WHERE a.id = ?
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Check if an active alert with the same level already exists for this ship.
     */
    public function activeExistsForShipLevel(int $shipId, string $level): bool {
        $stmt = $this->db->prepare("
            SELECT id FROM alerts
            WHERE ship_id = ? AND status = 'Active' AND level = ?
            LIMIT 1
        ");
        $stmt->execute([$shipId, $level]);
        return (bool) $stmt->fetch();
    }

    public function create(array $data): string {
        $id = 'ALT-' . time() . rand(100, 999);
        $stmt = $this->db->prepare("
            INSERT INTO alerts (id, ship_id, jenis, level, status, start_time_ms, waktu)
            VALUES (?, ?, ?, ?, 'Active', ?, ?)
        ");
        $stmt->execute([
            $id,
            $data['ship_id'],
            $data['jenis'],
            $data['level'],
            $data['start_time_ms'],
            $data['waktu'],
        ]);
        return $id;
    }

    public function resolve(string $id, string $resolvedAt, string $deskripsi = ''): void {
        $stmt = $this->db->prepare("
            UPDATE alerts
            SET status = 'Resolved', resolved_at = ?, deskripsi = ?
            WHERE id = ?
        ");
        $stmt->execute([$resolvedAt, $deskripsi, $id]);
    }

    public function getCountsByStatus(): array {
        $sql = "
            SELECT
                COUNT(*) AS total,
                SUM(status = 'Active') AS active_count,
                SUM(status = 'Active' AND level = 'Critical') AS critical_count
            FROM alerts
        ";
        return $this->db->query($sql)->fetch();
    }
}
