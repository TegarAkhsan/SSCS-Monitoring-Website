# SSCS Monitoring Website

Website ini adalah aplikasi monitoring kapal (Ship Monitoring System) yang dibangun menggunakan HTML, CSS, dan JavaScript murni. Aplikasi ini dirancang untuk menampilkan dashboard analitik, daftar kapal, detail monitoring, riwayat, peringatan (alerts), laporan, dan perencanaan.

Aplikasi ini menggunakan pendekatan berbasis komponen secara native di mana bagian-bagian halaman dipisahkan ke dalam file-file komponen di folder `components/` dan dimuat secara dinamis menggunakan JavaScript.

## 🚀 Cara Menjalankan Project (Live Server)

Karena project ini memuat file komponen secara dinamis menggunakan `fetch` API di JavaScript, Anda **tidak bisa** membukanya hanya dengan klik ganda file `index.html` (akan terjadi error CORS). Anda harus menjalankannya melalui local web server.

Cara termudah adalah menggunakan ekstensi **Live Server** di Visual Studio Code (VS Code).

### Cara Clone Project dari GitHub:
1. Pastikan Anda sudah menginstal [Git](https://git-scm.com/) di komputer Anda.
2. Buka terminal atau command prompt.
3. Jalankan perintah berikut untuk mengkloning repositori ini:
   ```bash
   git clone https://github.com/TegarAkhsan/SSCS-Monitoring-Website.git
   ```
4. Masuk ke folder project hasil clone:
   ```bash
   cd SSCS-Monitoring-Website
   ```

### Prasyarat:
1. Telah menginstal [Visual Studio Code](https://code.visualstudio.com/).

### Langkah-langkah:

1. **Buka Project di VS Code:**
   Buka folder project `SSCS Monitoring Website` di dalam Visual Studio Code.

2. **Instal Ekstensi Live Server:**
   * Di VS Code, buka panel **Extensions** (tekan `Ctrl+Shift+X` atau klik ikon kotak-kotak di menu samping kiri).
   * Pada kotak pencarian, ketik **"Live Server"**.
   * Cari ekstensi bernama **Live Server** (biasanya oleh Ritwick Dey) dan klik tombol **Install**.

3. **Jalankan Live Server:**
   Ada beberapa cara untuk menjalankan Live Server:
   * **Cara 1:** Buka file `index.html`, lalu klik kanan di area kode dan pilih **"Open with Live Server"**.
   * **Cara 2:** Buka file `index.html`, lalu klik tombol **"Go Live"** yang ada di pojok kanan bawah jendela VS Code (status bar).
   * **Cara 3:** Gunakan shortcut keyboard: `Alt+L` lalu tekan `Alt+O`.

4. **Selesai:**
   Browser default Anda otomatis akan terbuka dan menampilkan aplikasi di alamat `http://127.0.0.1:5500/index.html` (atau port lain tergantung ketersediaan).
   Aplikasi dan semua komponennya (Dashboard, Monitoring, dll) akan dimuat dengan sempurna.

## 📂 Struktur Project

```text
SSCS Monitoring Website/
├── index.html       # Halaman utama (kerangka/layout)
├── login.html       # Halaman login
├── README.md        # Dokumentasi project
├── css/
│   └── style.css    # Gaya/styling keseluruhan website
├── js/
│   └── app.js       # Logika utama (termasuk loader komponen)
├── components/      # Folder berisi potongan halaman (komponen)
│   ├── alert.html
│   ├── dashboard.html
│   ├── history.html
│   ├── laporan.html
│   ├── monitoring.html
│   └── planning.html
└── assets/          # (Opsional) Folder untuk gambar/icon jika ada
```

## 📝 Catatan Tambahan
* Jika Anda membuat perubahan pada file HTML, CSS, atau JavaScript, Live Server akan secara otomatis memuat ulang (auto-reload) halaman browser sehingga Anda dapat melihat perubahannya secara instan.
* Pastikan Anda selalu membuka dari `index.html` atau `login.html`.
