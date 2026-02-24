# 📋 WatchMe.log — New Feature TODO

> Last updated: 2026-02-19

---

## 🔥 High Priority

### 1. Statistik & Dashboard
- [ ] Buat halaman `/stats` baru
- [ ] Tampilkan total show yang ditonton, total episode, total film
- [ ] Grafik genre favorit (pie/donut chart)
- [ ] Grafik aktivitas menonton per bulan (bar chart)
- [ ] Rata-rata rating yang diberikan user
- [ ] Tambahkan link ke MobileNav & Header

### 2. Sort & Filter di Setiap Tab
- [x] Tambahkan komponen `SortFilterBar` di atas list show
- [x] Sort by: nama (A-Z / Z-A), tanggal ditambahkan, rating user, genre
- [ ] Filter by: genre, source (TVMaze / TMDB)
- [ ] Simpan preferensi sort/filter ke localStorage

### 3. Continue Watching (Next Episode)
- [x] Di tab **Watching**, tampilkan "episode berikutnya" yang belum ditonton secara prominent
- [x] Hitung next unwatched episode dari `watchedEpisodes`
- [x] Tampilkan badge "Next: S01E03" di ShowCard

---

## 🎨 UX / Quality of Life

### 4. Avatar Upload di Profile
- [ ] Tambahkan UI upload foto profil di `Profile.tsx`
- [ ] Integrasikan dengan Supabase Storage
- [ ] Tampilkan avatar di Header & MobileNav

### 5. Hapus Akun
- [ ] Tambahkan tombol "Hapus Akun" di `Profile.tsx`
- [ ] Konfirmasi dialog sebelum hapus
- [ ] Panggil Supabase `auth.admin.deleteUser` atau `rpc`

### 6. Share Show
- [ ] Tambahkan tombol share di `Detail.tsx`
- [ ] Share ke WhatsApp / copy link
- [ ] Format pesan: "Lagi nonton [Nama Show] ⭐ [Rating] — WatchMe.log"

### 7. Onboarding / Tutorial untuk User Baru
- [x] Deteksi user baru (pertama kali login, belum ada show)
- [x] Tampilkan tooltip/overlay singkat menjelaskan fitur utama
- [x] Simpan status onboarding ke localStorage / Supabase

---

## 🛠️ Technical

### 8. PWA / Offline Support
- [ ] Tambahkan `vite-plugin-pwa`
- [ ] Konfigurasi service worker untuk cache aset statis
- [ ] Tambahkan `manifest.json` dengan icon & theme color
- [ ] Test install di Android/iOS

### 9. Import / Export Data
- [ ] Tambahkan tombol Export di `Profile.tsx`
- [ ] Export daftar show ke format JSON
- [ ] (Opsional) Import dari file JSON
- [ ] (Opsional) Support format Trakt.tv / Letterboxd CSV



---

## 📌 Backlog / Nice to Have

- [ ] **Watchlist Reminder** — Notifikasi untuk show di watchlist yang sudah lama tidak disentuh
- [ ] **Halaman Genre** — Browse show by genre dengan pagination di `/genre`
- [ ] **Dark/Light mode toggle** yang lebih accessible di mobile
- [ ] **Keyboard shortcuts** untuk desktop (e.g. `/` untuk fokus search)
- [ ] **Infinite scroll** atau pagination di tab Watched (jika data banyak)
- [ ] **Rewatch tracking** — Tandai show yang sudah ditonton lebih dari sekali

---

## ✅ Sudah Selesai

- [x] Tracking show (Watchlist, Watching, Watched, Upcoming)
- [x] Episode tracking per season (bulk & individual)
- [x] Search TV Series (TVMaze) & Movies (TMDB)
- [x] Detail page dengan cast, synopsis, rating
- [x] Review & rating per show dan per season
- [x] Push notification episode baru
- [x] Multi-bahasa (ID / EN)
- [x] Dark mode
- [x] Mobile-first design + MobileNav
- [x] Fuzzy search di local tabs
- [x] SEO (sitemap, meta tags)
- [x] Auth (login, register, forgot password, reset password)
- [x] Profile management (nama & password)
- [x] React Router v7 future flags



{BUG / ISSUES}

-[ ] notif toast ketika belom ada episode (undefined) -> episode sudah tayang 5 hari yang lalu
-[ ] 