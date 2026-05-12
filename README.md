# IF670_94947_Week11

Project Week 11: integrasi Camera, Geolocation, dan Supabase.

## Fitur

- Mengambil foto dari kamera.
- Mengambil latitude dan longitude saat foto diambil.
- Upload foto ke Supabase Storage bucket `photos`.
- Insert metadata foto ke tabel Supabase `photo`.

## Struktur Supabase

Jalankan file `supabase.sql` di Supabase SQL Editor.

Tabel: `photo`

| Kolom | Tipe |
| --- | --- |
| id | bigint identity primary key |
| created_at | timestamp with time zone |
| latitude | float8 |
| longitude | float8 |
| image_url | text |

Storage bucket: `photos`

## Cara Menjalankan

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari `.env.example`:

```bash
cp .env.example .env
```

3. Isi `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

4. Jalankan project:

```bash
npx expo start
```

5. Buka di Expo Go atau emulator, lalu tekan tombol `Take Photo & Upload`.

## Catatan

Policy Supabase pada file SQL dibuat longgar untuk kebutuhan praktikum. Untuk aplikasi production, gunakan authentication dan batasi akses dengan RLS yang lebih aman.
