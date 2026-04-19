# SSCS Monitoring Website — Setup Guide

## Prasyarat
- **Laragon** (Apache + PHP >= 7.4 + MySQL/MariaDB)
- Pastikan `mod_rewrite` aktif di Apache

---

## Langkah Setup

### 1. Letakkan Proyek
Salin folder ini ke direktori web Laragon:
```
C:\laragon\www\sscs-monitoring\
```

### 2. Buat Database
1. Buka **phpMyAdmin** di `http://localhost/phpmyadmin`
2. Import file: `database/sscs_db.sql`
3. Database `sscs_db` akan terbuat otomatis

### 3. Konfigurasi Database
Edit file `backend/config/database.php` jika perlu:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sscs_db');
define('DB_USER', 'root');
define('DB_PASS', '');          // ganti jika ada password MySQL
```

### 4. Akses Aplikasi
Buka browser ke:
```
http://localhost/sscs-monitoring/frontend/
```

### 5. Login Default
| Username | Password |
|----------|----------|
| admin    | admin123 |

---

## Struktur Folder

```
sscs-monitoring/
├── backend/              ← PHP Backend (MVC)
│   ├── config/           ← Konfigurasi database
│   ├── controllers/      ← Controller per resource
│   ├── middleware/       ← Auth middleware
│   ├── models/           ← Model PDO
│   ├── routes/           ← API router
│   └── index.php         ← Entry point backend
├── frontend/             ← Frontend (HTML/CSS/JS)
│   ├── assets/           ← Gambar, ikon
│   ├── components/       ← HTML partials
│   ├── css/              ← Stylesheet
│   ├── js/
│   │   ├── api.js        ← Helper fetch ke API
│   │   └── app.js        ← Logika utama
│   ├── index.html        ← Halaman dashboard
│   ├── login.html        ← Halaman login
│   └── login.js          ← Login logic
└── database/
    └── sscs_db.sql       ← Schema + seed data MySQL
```

---

## API Endpoints

| Method | URL | Deskripsi |
|--------|-----|-----------|
| POST | `/backend/auth/login` | Login |
| POST | `/backend/auth/register` | Register |
| POST | `/backend/auth/logout` | Logout |
| GET | `/backend/auth/me` | Cek session |
| GET | `/backend/ships` | List kapal |
| POST | `/backend/ships` | Tambah kapal |
| POST | `/backend/ships/{imo}/stop` | Stop PSC |
| GET | `/backend/alerts` | List alert |
| PUT | `/backend/alerts/{id}/resolve` | Resolve alert |
| GET | `/backend/history` | Riwayat sesi |
| GET | `/backend/planning` | List planning |
| POST | `/backend/planning` | Tambah jadwal |
| POST | `/backend/planning/{id}/run` | Jalankan jadwal |
| GET | `/backend/simulation/tick` | Tick simulasi (poll 3s) |
| POST | `/backend/simulation/stop/{imo}` | Stop PSC via simulasi |
