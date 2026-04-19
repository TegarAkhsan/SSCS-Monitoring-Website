<?php
// ============================================================
// Model: Ship
// ============================================================
require_once __DIR__ . '/../config/database.php';

class Ship {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all ships joined with their current state.
     */
    public function getAll(): array {
        $sql = "
            SELECT s.*, 
                   COALESCE(ss.total_energy, 0)   AS total_energy,
                   COALESCE(ss.realtime_power, 0)  AS realtime_power,
                   COALESCE(ss.is_connected, 0)    AS is_connected,
                   COALESCE(ss.is_stopped, 0)      AS is_stopped
            FROM ships s
            LEFT JOIN ship_states ss ON ss.ship_id = s.id
            ORDER BY s.id ASC
        ";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Get single ship by IMO, joined with state.
     */
    public function findByImo(string $imo): ?array {
        $sql = "
            SELECT s.*,
                   COALESCE(ss.total_energy, 0)   AS total_energy,
                   COALESCE(ss.realtime_power, 0)  AS realtime_power,
                   COALESCE(ss.is_connected, 0)    AS is_connected,
                   COALESCE(ss.is_stopped, 0)      AS is_stopped
            FROM ships s
            LEFT JOIN ship_states ss ON ss.ship_id = s.id
            WHERE s.imo = ?
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$imo]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM ships WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Create a new ship and initialize its state.
     */
    public function create(array $data): int {
        $stmt = $this->db->prepare("
            INSERT INTO ships (name, type, imo, no_ppk, no_prc, kegiatan, grt, loa, voyage, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ");
        $stmt->execute([
            $data['name'],
            $data['type'] ?? 'General Cargo',
            $data['imo'],
            $data['no_ppk'] ?? null,
            $data['no_prc'] ?? null,
            $data['kegiatan'] ?? 'BONGKAR',
            $data['grt'] ?? 0,
            $data['loa'] ?? 0,
            $data['voyage'] ?? 'DALAMNEGERI',
        ]);
        $shipId = (int) $this->db->lastInsertId();
        // Init state
        $this->db->prepare("INSERT INTO ship_states (ship_id) VALUES (?)")->execute([$shipId]);
        return $shipId;
    }

    /**
     * Update ship state (realtime energy simulation tick).
     */
    public function updateState(int $shipId, float $realtimePower, float $energyDelta, bool $connected): void {
        $stmt = $this->db->prepare("
            UPDATE ship_states
            SET realtime_power = ?,
                total_energy   = total_energy + ?,
                is_connected   = ?
            WHERE ship_id = ?
        ");
        $stmt->execute([(float)$realtimePower, (float)$energyDelta, (int)$connected, $shipId]);
    }

    /**
     * Stop a ship's PSC (set is_stopped = 1, realtime = 0, connected = 0)
     */
    public function stopShip(int $shipId): void {
        $stmt = $this->db->prepare("
            UPDATE ship_states
            SET is_stopped = 1, realtime_power = 0, is_connected = 0
            WHERE ship_id = ?
        ");
        $stmt->execute([$shipId]);
        $this->db->prepare("UPDATE ships SET status = 'stopped' WHERE id = ?")->execute([$shipId]);
    }

    /**
     * Get all active (not stopped) ships.
     */
    public function getActiveShips(): array {
        $sql = "
            SELECT s.id, s.imo,
                   COALESCE(ss.is_stopped, 0) AS is_stopped,
                   COALESCE(ss.is_connected, 0) AS is_connected,
                   COALESCE(ss.realtime_power, 0) AS realtime_power,
                   COALESCE(ss.total_energy, 0) AS total_energy
            FROM ships s
            LEFT JOIN ship_states ss ON ss.ship_id = s.id
            WHERE COALESCE(ss.is_stopped, 0) = 0
        ";
        return $this->db->query($sql)->fetchAll();
    }
}
