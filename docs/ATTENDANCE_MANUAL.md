# Fitur Absensi Manual - Dokumentasi

## 📋 Deskripsi Fitur
Fitur **Absensi Manual** memungkinkan karyawan untuk melakukan absensi (masuk/pulang) tanpa menggunakan face recognition, dengan alasan tertulis yang dicatat.

---

## 🎯 Use Cases
1. **Kamera tidak tersedia** → Gunakan absensi manual
2. **Wajah belum terdaftar** → Absensi manual sebagai alternatif
3. **Model AI sedang dimuat** → Tidak perlu menunggu, langsung absensi manual
4. **Lupa absensi masuk/pulang** → Bisa absensi manual dengan alasan

---

## 🔄 Alur User Flow

### Absensi Masuk Manual
```
User ke halaman Absensi
    ↓
Status "Belum Absen Masuk" ditampilkan
    ↓
Klik tombol "Absen Manual" (biru)
    ↓
Modal muncul: "📍 Absen Masuk Manual"
    ↓
User isi alasan (minimal 5 karakter)
    ↓
Klik "✓ Konfirmasi Masuk"
    ↓
Backend menerima POST /attendance/clock-in-manual
    ↓
Sistem cek: Sudah absensi hari ini?
    ↓
Jika belum: Simpan record dengan status 'present_manual' atau 'late_manual'
    ↓
Success alert + status berubah jadi "checked_in"
    ↓
Tombol berubah jadi "Pulang Manual"
```

### Absensi Pulang Manual
```
User sudah masuk, tombol berubah "Pulang Manual"
    ↓
Klik tombol "Pulang Manual" (biru)
    ↓
Modal muncul: "👋 Absen Pulang Manual"
    ↓
User isi alasan (minimal 5 karakter)
    ↓
Klik "✓ Konfirmasi Pulang"
    ↓
Backend menerima POST /attendance/clock-out-manual
    ↓
Sistem cek: Sudah clock-out hari ini?
    ↓
Jika belum: Update record dengan clock_out timestamp
    ↓
Success alert + halaman show "Absensi Hari Ini Selesai"
```

---

## 🛠️ Implementasi Teknis

### Frontend (React/Vite)

**File:** `src/pages/Attendance.jsx`

#### State Management
```javascript
const [showManualModal, setShowManualModal] = useState(false);
const [manualReason, setManualReason] = useState('');
```

#### Handler Function
```javascript
const handleManualAttendance = async () => {
    // Validasi alasan minimal 5 karakter
    // Tentukan endpoint berdasarkan status (clock-in vs clock-out)
    // POST request dengan reason di FormData
    // Refresh history & status setelah berhasil
}
```

#### Buttons
- **Absensi Masuk Manual:** `todayStatus === 'none'`
- **Absensi Pulang Manual:** `todayStatus === 'checked_in'`
- Selalu ditampilkan di atas area foto, independent dari model loading

#### Modal Features
- Subtitle menjelaskan alasan
- Placeholder berbeda untuk masuk vs pulang
- Helper text: "Minimal 5 karakter, maksimal 500 karakter"
- Tombol Konfirmasi disabled jika alasan < 5 karakter
- AutoFocus pada textarea

---

### Backend (PHP)

**File:** `api/controllers/AttendanceController.php`

#### Endpoint 1: Clock-In Manual
```php
POST /attendance/clock-in-manual

Request:
{
    "reason": "Terlambat karena macet" (required, string)
}

Response Success (200):
{
    "status": true,
    "message": "Absen Manual Berhasil!" | "Absen Manual Berhasil (Telat X menit)",
    "late_minutes": 0 | integer,
    "reason": string
}

Response Error (400):
{
    "status": false,
    "message": "Sudah absen masuk hari ini."
}
```

#### Logic Clock-In Manual
1. Autentikasi via JWT token
2. Cek: Sudah absen masuk hari ini?
3. Ambil shift_start dari user profile
4. Hitung late_minutes (tolerance 5 menit)
5. Set status: `present_manual` atau `late_manual`
6. Simpan ke tabel `attendance` dengan:
   - `clock_in = NOW()`
   - `photo_in = NULL`
   - `lat_in = 0`, `long_in = 0`
   - `status = 'present_manual'|'late_manual'`
   - `late_minutes = calculated`

#### Endpoint 2: Clock-Out Manual
```php
POST /attendance/clock-out-manual

Request:
{
    "reason": "Meeting dengan client" (required, string)
}

Response Success (200):
{
    "status": true,
    "message": "Pulang Manual Berhasil! Sampai jumpa besok.",
    "reason": string
}

Response Error (400):
{
    "status": false,
    "message": "Belum absen masuk hari ini." | "Sudah absen pulang hari ini."
}
```

#### Logic Clock-Out Manual
1. Autentikasi via JWT token
2. Cek: Ada record clock-in hari ini?
3. Cek: Belum clock-out?
4. Update record dengan `clock_out = NOW()`
5. Set `photo_out = NULL`, `lat_out = 0`, `long_out = 0`

---

## 📊 Database Structure

**Tabel:** `attendance`

| Column | Type | Manual Masuk | Manual Pulang |
|--------|------|--------------|---------------|
| `id` | INT | ✓ auto-generated | ✓ existing |
| `user_id` | INT | ✓ from JWT | ✓ from JWT |
| `date` | DATE | ✓ TODAY() | ✓ existing |
| `clock_in` | DATETIME | ✓ NOW() | ✓ existing |
| `clock_out` | DATETIME | NULL | ✓ NOW() |
| `photo_in` | VARCHAR | NULL | ✓ existing |
| `photo_out` | VARCHAR | NULL | ✓ NULL |
| `lat_in` | DECIMAL | 0 | ✓ existing |
| `long_in` | DECIMAL | 0 | ✓ existing |
| `lat_out` | DECIMAL | 0 | ✓ existing |
| `long_out` | DECIMAL | 0 | ✓ existing |
| `status` | VARCHAR | present_manual / late_manual | ✓ existing |
| `late_minutes` | INT | calculated | ✓ existing |

---

## ✅ Validasi & Error Handling

### Frontend Validasi
- [ ] Alasan tidak boleh kosong → Show warning alert
- [ ] Alasan minimal 5 karakter → Disable submit button
- [ ] Tombol selalu disabled saat processing

### Backend Validasi
- [ ] Token valid (JWT authentication)
- [ ] Cek double absen (sudah masuk/pulang hari ini)
- [ ] Hitung late minutes jika > 5 menit setelah shift_start
- [ ] Handle database errors gracefully

---

## 🎨 UI/UX Details

### Modal Dialog
- **Width:** max-w-sm (384px)
- **Position:** centered, fixed
- **Backdrop:** bg-black/50 (semi-transparent)
- **Border Radius:** rounded-2xl
- **Close Button:** X icon di top-right

### Form Elements
- **Label:** uppercase, gray-600, tracking-wide
- **Textarea:** 4 rows, placeholder contextual, focus ring blue
- **Buttons:** 
  - Batal: gray-100 text
  - Konfirmasi: blue-600 (enabled) atau gray-400 (disabled)

### Status Indicators
- **Belum Masuk:** Blue badge "Belum Absen Masuk"
- **Sudah Masuk:** Green badge "Sudah Masuk. Waktunya Pulang?"
- **Sudah Pulang:** Gray badge "Absensi Hari Ini Selesai"

---

## 🧪 Testing Checklist

- [ ] Absensi masuk manual berhasil (tanpa foto)
- [ ] Alasan tersimpan dengan benar
- [ ] Status berubah menjadi checked_in
- [ ] Tombol berubah menjadi "Pulang Manual"
- [ ] Validasi: Tidak bisa double absen masuk
- [ ] Hitung late minutes: tepat jika > 5 menit
- [ ] Absensi pulang manual berhasil
- [ ] Validasi: Tidak bisa pulang tanpa masuk dulu
- [ ] Validasi: Tidak bisa double pulang
- [ ] History diupdate otomatis setelah absen
- [ ] Modal tertutup setelah submit
- [ ] Error messages ditampilkan dengan baik
- [ ] Works di mobile, tablet, desktop
- [ ] GPS indicator tetap berfungsi

---

## 📝 Catatan Maintenance

1. **Alasan tidak disimpan secara terpisah** → Jika diperlukan audit alasan, perlu tambah kolom `manual_reason` di tabel `attendance`
2. **Status 'present_manual' vs 'late_manual'** → Hanya untuk tracking manual vs face recognition. Jika perlu beda handling, perlu update payroll/report queries
3. **Toleransi 5 menit** → Hardcoded di backend (`strtotime($now) > strtotime($shiftStart) + 300`). Jika perlu flexible, buat di settings table
4. **Location tidak dikirim** → Manual attendance tidak mencatat GPS. Ini by design (tidak bisa ambil lokasi real). Jika perlu, tambah JS geolocation API

---

## 🚀 Fitur Tambahan (Future)

1. **Audit Trail** → Log siapa yang absen manual & kapan
2. **Admin Approval** → Absensi manual butuh approval sebelum final
3. **Flexible Alasan** → Dropdown menu untuk alasan baku (macet, sakit, meeting, dll)
4. **Photo Optional** → Allow foto manual juga (tidak pakai face-api)
5. **Export Report** → List semua absensi manual dalam periode tertentu
