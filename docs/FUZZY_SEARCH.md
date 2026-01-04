# Fuzzy Search Implementation

## Apa itu Fuzzy Search?

Fuzzy Search adalah fitur pencarian yang memungkinkan pengguna menemukan hasil meskipun ada kesalahan pengetikan (typo) atau kata yang mirip. Fitur ini sangat membantu ketika Anda tidak ingat ejaan persis dari sebuah judul film atau series.

## Contoh Penggunaan

Jika Anda mencari film **"Breaking Bad"**, fuzzy search akan menemukan hasil untuk:
- "breking bad" (typo)
- "breaking" (partial)
- "breking" (typo tanpa kata "bad")
- "braking bad" (similar spelling)

## Cara Kerja

### Library yang Digunakan
Implementasi ini menggunakan **Fuse.js**, library JavaScript yang populer untuk fuzzy searching.

### Konfigurasi
```typescript
{
  threshold: 0.3,  // Toleransi typo (0 = exact match, 1 = match anything)
  keys: ['name', 'summary', 'genres'],  // Field yang dicari
  ignoreLocation: true,  // Cari di mana saja dalam text
  minMatchCharLength: 2,  // Minimal 2 karakter untuk match
}
```

### Di Mana Fuzzy Search Digunakan

Fuzzy search **HANYA** diterapkan pada **pencarian lokal** di tab:
- ✅ **Watching** - Daftar yang sedang ditonton
- ✅ **Watchlist** - Daftar yang akan ditonton
- ✅ **Watched** - Daftar yang sudah ditonton
- ✅ **Upcoming** - Jadwal tayang yang akan datang

Fuzzy search **TIDAK** diterapkan pada:
- ❌ **Search Tab** - Menggunakan API eksternal (TVMaze & TMDB)

## File yang Dimodifikasi

1. **`src/hooks/useFuzzySearch.tsx`** - Custom hook untuk fuzzy search
2. **`src/pages/Index.tsx`** - Implementasi fuzzy search di semua local tabs

## Menyesuaikan Toleransi Pencarian

Anda bisa mengubah tingkat toleransi typo dengan mengubah nilai `threshold`:

```typescript
// Lebih strict (lebih sedikit toleransi typo)
const filtered = useFuzzySearch(items, query, { threshold: 0.2 });

// Lebih loose (lebih banyak toleransi typo)
const filtered = useFuzzySearch(items, query, { threshold: 0.5 });
```

**Nilai threshold:**
- `0.0` = Perfect match (exact)
- `0.1 - 0.3` = Strict (sedikit toleransi typo)
- `0.4 - 0.6` = Moderate (toleransi sedang)
- `0.7 - 1.0` = Loose (sangat toleran, hampir semua match)

**Default:** `0.3` (seimbang antara akurasi dan fleksibilitas)

## Testing

### Cara Test Fuzzy Search:

1. Pastikan Anda sudah login dan memiliki beberapa show di watchlist/watching
2. Buka tab **Watching**, **Watchlist**, **Watched**, atau **Upcoming**
3. Ketik di search bar dengan sengaja typo, misalnya:
   - Jika ada show "The Office", coba ketik "ofice" atau "offce"
   - Jika ada show "Friends", coba ketik "frends" atau "friend"
   - Coba juga pencarian partial seperti "bre" untuk "Breaking Bad"

4. Hasil yang mirip akan tetap muncul meskipun ada typo!

## Benefit

✅ Lebih user-friendly
✅ Tidak perlu mengingat ejaan persis
✅ Menemukan hasil lebih cepat
✅ Mengurangi frustasi saat mencari
