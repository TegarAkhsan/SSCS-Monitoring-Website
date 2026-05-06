# 🚢 SSCS Monitoring Website — Documentation

Sistem monitoring cerdas untuk operasional kapal dan manajemen alert secara real-time. Proyek ini dibangun menggunakan **PHP (Backend)** dan **Vanilla JS (Frontend)** dengan integrasi database MySQL.

---

## 🛠️ Prasyarat (Requirements)
Sebelum memulai, pastikan perangkat Anda sudah terinstall:
- **XAMPP** atau **Laragon** (PHP >= 7.4 & MySQL/MariaDB)
- **Web Browser** terbaru (Chrome, Edge, atau Firefox)
- **Ngrok** (Opsional, hanya jika ingin menjalankan secara tunneling/online)

---

## 🚀 Cara Menjalankan Secara Lokal (Normal)

Ikuti langkah-langkah berikut untuk setup di komputer lokal:

### 1. Penempatan Folder
- Jika menggunakan **XAMPP**: Salin folder proyek ini ke `C:\xampp\htdocs\sscs-monitoring\`
- Jika menggunakan **Laragon**: Salin folder proyek ini ke `C:\laragon\www\sscs-monitoring\`

### 2. Setup Database
1. Jalankan Apache dan MySQL melalui Control Panel XAMPP/Laragon.
2. Buka **phpMyAdmin** di browser: `http://localhost/phpmyadmin`
3. Buat database baru dengan nama `sscs_db`.
4. Pilih database tersebut, lalu klik tab **Import**.
5. Pilih file `database/sscs_db.sql` yang ada di dalam folder proyek, lalu klik **Go**.

### 3. Konfigurasi Database
Jika Anda menggunakan password pada MySQL (XAMPP defaultnya kosong), sesuaikan konfigurasi di file:
`backend/config/database.php`
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sscs_db');
define('DB_USER', 'root');
define('DB_PASS', ''); // Isi password jika ada
```

### 4. Akses Aplikasi
Buka browser dan akses alamat berikut:
`http://localhost/sscs-monitoring/frontend/`

---

## 🌐 Cara Menjalankan via Tunneling (Ngrok)

Gunakan metode ini jika Anda ingin aplikasi lokal Anda bisa diakses secara online oleh orang lain melalui internet.

### 1. Persiapan Ngrok
- Download Ngrok di [ngrok.com](https://ngrok.com/download) dan lakukan login/registrasi.
- Masukkan `authtoken` Anda sesuai instruksi di dashboard Ngrok.

### 2. Menjalankan Tunnel
Buka Terminal atau Command Prompt, lalu ketik perintah berikut:
```bash
ngrok http 80
```
*(Gunakan port 80 jika Anda menggunakan port default Apache XAMPP).*

### 3. Akses URL Publik
- Ngrok akan memberikan URL publik (contoh: `https://abcd-1234.ngrok-free.app`).
- Salin URL tersebut dan tambahkan path folder proyek Anda.
- **Akses di browser:** `https://abcd-1234.ngrok-free.app/sscs-monitoring/frontend/`

> [!TIP]
> Jika muncul halaman **"Ngrok Browser Warning"**, cukup klik tombol **"Visit Site"** untuk melanjutkan ke aplikasi.

---

## 🔐 Informasi Login Default
Gunakan akun berikut untuk masuk ke sistem:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` |

---

## 📁 Struktur Proyek
- `backend/` : Logika server, API, dan koneksi database.
- `frontend/` : Tampilan antarmuka (HTML, CSS, JS).
- `database/` : File SQL untuk struktur data.
- `.htaccess` : Konfigurasi routing untuk Apache.

---

## ❓ Troubleshooting
- **API Error / 404:** Pastikan modul `mod_rewrite` di Apache sudah aktif.
- **Database Connection Failed:** Periksa kembali `DB_USER` dan `DB_PASS` di `backend/config/database.php`.
- **Ngrok Stuck:** Pastikan XAMPP/Laragon sudah running terlebih dahulu sebelum menjalankan perintah ngrok.

---
*Dibuat untuk sistem pemantauan kapal SSCS yang efisien dan aman.*
