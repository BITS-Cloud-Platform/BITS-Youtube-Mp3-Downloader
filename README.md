# BITS YouTube Downloader

Bulk YouTube playlist/podcast downloader → m4a (AAC audio) + cookies auth for unlisted/private videos.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + Tailwind CSS (Docker) |
| Backend  | FastAPI + yt-dlp |
| Queue    | Celery + Redis |
| Database | SQLite (via SQLAlchemy + aiosqlite) |
| Auth     | JWT (HS256) + bcrypt |
| Storage  | Docker volume (persisted files + cookies) |

## Quick Start

```bash
cd yt-downloader
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Redis | localhost:6379 |

## Setup Cookies untuk Video Unlisted/Private

1. Login ke channel YouTube di browser Chrome
2. Install ekstensi **Get cookies.txt** (Chrome Web Store)
3. Buka halaman upload video di YouTube (Studio)
4. Klik ekstensi → Export cookies ke `cookies.txt`
5. Buka dashboard → **Cookies** section → upload file `cookies.txt`
6. yt-dlp kini bisa akses video unlisted/private milik channel

Cookies disimpan di volume `/app/data/cookies.txt` dan dipakai oleh semua worker.

## Features

- Email/password auth (register + login)
- Submit YouTube playlist URLs
- Async download via Celery worker (m4a audio only)
- Progress tracking per job
- Download completed files
- JWT-based auth on every API call
- Cookies auth support untuk akses unlisted/private video

## Format

App mendownload **m4a (AAC)** audio. AAC lebih unggul dari MP3 di bitrate yang sama tanpa perlu proses transcode FFmpeg.

Untuk output MP3, tambahkan `ffmpeg` di Dockerfile backend (sudah tersedia di image) dan ubah env `YTDL_FORMAT=mp3`.

## Cara Pakai

1. Buka http://localhost:3000
2. Register akun atau login
3. (Admin) Upload cookies.txt di halaman Cookies
4. Paste YouTube playlist URL → klik Download
5. Tunggu proses → klik Download untuk file yang sudah siap

## Konfigurasi Environment

| Variable | Default | Keterangan |
|----------|---------|------------|
| `DATABASE_URL` | `sqlite:////app/data/downloads.db` | SQLite path |
| `REDIS_URL` | `redis://redis:6379/0` | Redis broker |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `YTDL_FORMAT` | `m4a` | Audio format |
| `COOKIES_PATH` | `/app/data/cookies.txt` | Path cookies file |
| `STORAGE_DIR` | `/app/storage` | Download path |

## Notes

- yt-dlp handles audio extraction natively (no separate FFmpeg step needed for m4a)
- Untuk MP3 output: tambahkan FFmpeg ke Dockerfile (sudah available), ganti `YTDL_FORMAT=mp3`, ganti `COOKIES_PATH` untuk mengaktifkan cookies
- SQLite cukup untuk skala kecil-menengah; ganti PostgreSQL untuk produksi
- Docker volumes persist downloads, database, dan cookies across restarts