<?php
require_once __DIR__ . '/config/database.php';
try {
    $db = Database::getInstance();
    $db->exec("ALTER TABLE planning 
        ADD COLUMN etd VARCHAR(50), 
        ADD COLUMN no_ppk VARCHAR(50), 
        ADD COLUMN no_prc VARCHAR(50), 
        ADD COLUMN kegiatan VARCHAR(50) DEFAULT 'BONGKAR', 
        ADD COLUMN grt INT(11) DEFAULT 0, 
        ADD COLUMN loa DECIMAL(7,2) DEFAULT 0.00;");
    echo "Migration success\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
