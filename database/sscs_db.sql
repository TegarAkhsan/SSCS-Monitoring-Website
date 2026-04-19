-- ============================================================
-- SSCS Monitoring Website - Database Schema
-- Smart Shore Connection System
-- Engine: MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+07:00";

-- ------------------------------------------------------------
-- Create Database
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `sscs_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sscs_db`;

-- ------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL,
  `email`      VARCHAR(100) NOT NULL,
  `password`   VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  `role`       ENUM('admin','operator') NOT NULL DEFAULT 'operator',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: ships
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ships` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `type`       VARCHAR(50)  NOT NULL DEFAULT 'General Cargo',
  `imo`        VARCHAR(20)  NOT NULL,
  `no_ppk`     VARCHAR(50)  DEFAULT NULL,
  `no_prc`     VARCHAR(50)  DEFAULT NULL,
  `kegiatan`   VARCHAR(50)  DEFAULT 'BONGKAR',
  `grt`        INT(11)      DEFAULT 0,
  `loa`        DECIMAL(7,2) DEFAULT 0.00,
  `voyage`     VARCHAR(50)  DEFAULT 'DALAMNEGERI',
  `status`     ENUM('active','stopped') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_imo` (`imo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: ship_states
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ship_states` (
  `id`             INT(11)       NOT NULL AUTO_INCREMENT,
  `ship_id`        INT(11)       NOT NULL,
  `total_energy`   DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'kWh akumulasi',
  `realtime_power` DECIMAL(8,2)  NOT NULL DEFAULT 0.00 COMMENT 'kW realtime',
  `is_connected`   TINYINT(1)    NOT NULL DEFAULT 0,
  `is_stopped`     TINYINT(1)    NOT NULL DEFAULT 0,
  `updated_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ship_state` (`ship_id`),
  CONSTRAINT `fk_state_ship` FOREIGN KEY (`ship_id`) REFERENCES `ships` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `alerts` (
  `id`            VARCHAR(30)  NOT NULL,
  `ship_id`       INT(11)      NOT NULL,
  `jenis`         VARCHAR(100) NOT NULL,
  `level`         ENUM('Low','Medium','High','Critical') NOT NULL,
  `status`        ENUM('Active','Resolved') NOT NULL DEFAULT 'Active',
  `start_time_ms` BIGINT(20)   NOT NULL,
  `waktu`         VARCHAR(50)  NOT NULL,
  `resolved_at`   VARCHAR(50)  DEFAULT NULL,
  `deskripsi`     TEXT         DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ship_id` (`ship_id`),
  KEY `idx_status`  (`status`),
  CONSTRAINT `fk_alert_ship` FOREIGN KEY (`ship_id`) REFERENCES `ships` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: history
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `history` (
  `id`         VARCHAR(30)   NOT NULL,
  `ship_id`    INT(11)       NOT NULL,
  `start_time` VARCHAR(50)   NOT NULL,
  `end_time`   VARCHAR(50)   DEFAULT NULL COMMENT 'NULL = sedang berjalan',
  `date_only`  DATE          NOT NULL,
  `energy`     DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'kWh',
  `co2`        DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'kg',
  `status`     ENUM('Connected','Disconnected') NOT NULL DEFAULT 'Connected',
  `operasi`    VARCHAR(50)   DEFAULT 'On The Move',
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ship_id`  (`ship_id`),
  KEY `idx_date_only`(`date_only`),
  CONSTRAINT `fk_history_ship` FOREIGN KEY (`ship_id`) REFERENCES `ships` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: planning
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `planning` (
  `id`         INT(11)     NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `dermaga`    VARCHAR(10)  NOT NULL,
  `date`       VARCHAR(50)  NOT NULL COMMENT 'Waktu sandar ETA',
  `status`     ENUM('scheduled','done') NOT NULL DEFAULT 'scheduled',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default admin user (password: admin123)
INSERT INTO `users` (`username`, `email`, `password`, `role`) VALUES
('admin', 'admin@sscs.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Default ships
INSERT INTO `ships` (`name`, `type`, `imo`, `no_ppk`, `no_prc`, `kegiatan`, `grt`, `loa`, `voyage`, `status`) VALUES
('MV. MEGHNA LIBERTY',    'KPLCURAHKR',   'I000036365', 'V92690000470426',  'OP92690000410426', 'MUAT',    31877, 189.99, 'LUARNEGERI', 'active'),
('MV. SUN PLENTY',        'Curah Kering',  'K001016851', 'V92690000460426',  'OP92690000400426', 'BONGKAR', 32415, 189.99, 'LUARNEGERI', 'active'),
('MV. GLORY DYNASTY',     'KPLCARGO',      'I000013810', 'V92690000450326',  'OP92690000390326', 'BONGKAR',  6632, 103.63, 'LUARNEGERI', 'active'),
('MV. XIN HANG 9',        'KPLCARGO',      'I000043068', 'V92690000440326',  'OP92690000380326', 'BONGKAR',  9160, 136.00, 'LUARNEGERI', 'active'),
('BALI STRAIT',           'Curah Kering',  'K001015659', 'V92690000430326',  'OP92690000370326', 'BONGKAR', 10248, 149.70, 'DALAMNEGERI','active'),
('MV. ROSTRUM AUSTRALIA', 'Curah Kering',  'K001016909', 'V92690000410326',  'OP92690000360326', 'BONGKAR', 25859, 179.97, 'LUARNEGERI', 'active'),
('MV. MALTEZA',           'Curah Kering',  'K001016760', 'V92690000400326',  'OP92690000350326', 'BONGKAR', 31250, 189.99, 'LUARNEGERI', 'active'),
('MV. DK ARTEMIS',        'Curah Kering',  'K001013556', 'V92690000380326',  'OP92690000340326', 'BONGKAR',  7506, 110.49, 'LUARNEGERI', 'active'),
('MV. DEVBULK DEMET',     'KPLCARGO',      'I000027695', 'V92690000360326',  'OP92690000330326', 'BONGKAR', 19999, 178.70, 'LUARNEGERI', 'active'),
('XIN YI BO LI 01',       'Curah Kering',  'K001015594', 'V92690000350326',  'OP92690000320326', 'BONGKAR',  3666,  98.80, 'LUARNEGERI', 'active');

-- Initialize ship_states for each ship (id 1-10)
INSERT INTO `ship_states` (`ship_id`, `total_energy`, `realtime_power`, `is_connected`, `is_stopped`) VALUES
(1, 0.00, 0.00, 0, 0),
(2, 0.00, 0.00, 0, 0),
(3, 0.00, 0.00, 0, 0),
(4, 0.00, 0.00, 0, 0),
(5, 0.00, 0.00, 0, 0),
(6, 0.00, 0.00, 0, 0),
(7, 0.00, 0.00, 0, 0),
(8, 0.00, 0.00, 0, 0),
(9, 0.00, 0.00, 0, 0),
(10, 0.00, 0.00, 0, 0);

COMMIT;
