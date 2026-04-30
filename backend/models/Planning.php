<?php
// ============================================================
// Model: Planning
// ============================================================
require_once __DIR__ . '/../config/database.php';

class Planning {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->checkAndMigrateSchema();
    }

    private function checkAndMigrateSchema(): void {
        try {
            // Check if 'etd' exists
            $this->db->query("SELECT etd FROM planning LIMIT 1");
        } catch (PDOException $e) {
            // If column doesn't exist, it will throw an exception. Add missing columns.
            try {
                $this->db->exec("ALTER TABLE planning 
                    ADD COLUMN etd VARCHAR(50) DEFAULT NULL, 
                    ADD COLUMN no_ppk VARCHAR(50) DEFAULT NULL, 
                    ADD COLUMN no_prc VARCHAR(50) DEFAULT NULL, 
                    ADD COLUMN kegiatan VARCHAR(50) DEFAULT 'BONGKAR', 
                    ADD COLUMN grt INT(11) DEFAULT 0, 
                    ADD COLUMN loa DECIMAL(7,2) DEFAULT 0.00;");
            } catch (PDOException $e2) {
                // Ignore if it fails (e.g., partial columns exist)
            }
        }
    }

    public function getAll(string $status = 'scheduled'): array {
        if ($status === 'all') {
            return $this->db->query("SELECT * FROM planning ORDER BY created_at DESC")->fetchAll();
        }
        $stmt = $this->db->prepare("SELECT * FROM planning WHERE status = ? ORDER BY created_at DESC");
        $stmt->execute([$status]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM planning WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int {
        $stmt = $this->db->prepare(
            "INSERT INTO planning (name, dermaga, date, etd, no_ppk, no_prc, kegiatan, grt, loa)
             VALUES (:name, :dermaga, :date, :etd, :no_ppk, :no_prc, :kegiatan, :grt, :loa)"
        );
        $stmt->execute([
            ':name'     => $data['name'],
            ':dermaga'  => $data['dermaga'],
            ':date'     => $data['date'],
            ':etd'      => $data['etd']     ?? null,
            ':no_ppk'   => $data['no_ppk']  ?? null,
            ':no_prc'   => $data['no_prc']  ?? null,
            ':kegiatan' => $data['kegiatan'] ?? 'BONGKAR',
            ':grt'      => $data['grt']     ?? null,
            ':loa'      => $data['loa']     ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void {
        $stmt = $this->db->prepare(
            "UPDATE planning SET name=:name, dermaga=:dermaga, date=:date, etd=:etd,
             no_ppk=:no_ppk, no_prc=:no_prc, kegiatan=:kegiatan, grt=:grt, loa=:loa
             WHERE id=:id"
        );
        $stmt->execute([
            ':name'     => $data['name'],
            ':dermaga'  => $data['dermaga'],
            ':date'     => $data['date'],
            ':etd'      => $data['etd']     ?? null,
            ':no_ppk'   => $data['no_ppk']  ?? null,
            ':no_prc'   => $data['no_prc']  ?? null,
            ':kegiatan' => $data['kegiatan'] ?? 'BONGKAR',
            ':grt'      => $data['grt']     ?? null,
            ':loa'      => $data['loa']     ?? null,
            ':id'       => $id,
        ]);
    }

    public function markAsDone(int $id): void {
        $stmt = $this->db->prepare("UPDATE planning SET status = 'done' WHERE id = ?");
        $stmt->execute([$id]);
    }

    public function delete(int $id): void {
        $stmt = $this->db->prepare("DELETE FROM planning WHERE id = ?");
        $stmt->execute([$id]);
    }
}
