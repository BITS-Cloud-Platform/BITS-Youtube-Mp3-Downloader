# YTMp3.in

Bulk YouTube audio downloader — m4a (AAC) output, per-user cookies auth, dark neomorphic UI. Mendukung single video dan playlist penuh, dengan resume, retry per-item, dan progress bar.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 + Tailwind CSS v4 + Lucide icons |
| Backend  | FastAPI + yt-dlp |
| Queue    | Celery + Redis |
| Database | SQLite (via SQLAlchemy) |
| Auth     | JWT (HS256) + bcrypt, httpOnly cookies |
| Storage  | File system (per-user folders) |

## Fitur

- Register/login email dengan httpOnly JWT cookies
- Download single video atau playlist YouTube → m4a (AAC)
- Progress bar real-time di dashboard
- Per-item download: setiap file bisa didownload begitu selesai
- Resume otomatis: file yang sudah terdownload dilewati saat diulang
- Retry per-item untuk video yang gagal
- Cookies auth (upload `cookies.txt`) untuk akses video unlisted/private
- Dark neomorphic UI

## Development Mode

### Prasyarat

- Python >= 3.12
- Node.js >= 22
- Redis (dijalankan secara lokal atau via Docker)

### Setup Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Jalankan backend:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Jalankan Celery worker:

```bash
cd backend
source .venv/bin/activate
celery -A tasks worker --loglevel=info --concurrency=2
```

### Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di http://localhost:3000, backend di http://localhost:8000.

## Production Mode

### Docker Compose (Rekomendasi)

```bash
docker compose up --build -d
```

### Manual (Production)

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000

# Celery
celery -A tasks worker --loglevel=info --concurrency=4

# Frontend
cd frontend
npm install
npm run build
npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:////app/data/downloads.db` | Path database SQLite |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis broker URL |
| `SECRET_KEY` | *(random)* | JWT signing key |
| `YTDL_FORMAT` | `m4a` | Format audio output |
| `STORAGE_DIR` | `/app/storage` | Penyimpanan file hasil download |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins |
| `PASSWORD_MIN_LENGTH` | `8` | Minimal panjang password |

## Setup Cookies

Untuk mengakses video YouTube unlisted/private, Anda perlu upload cookies:

1. Install ekstensi [Get cookies.txt](https://chrome.google.com/webstore/detail/get-cookiestxt/bgaddhkoddajcdgocldbbfleckgcbcid) di Chrome
2. Kunjungi YouTube.com dan pastikan sudah login
3. Klik ikon ekstensi → Export → simpan sebagai `cookies.txt`
4. Buka dashboard YTMp3 → Profile → upload file `cookies.txt`

Cookies disimpan per-user di folder `data/users/{user_id}/cookies.txt`.

## Maps Folder

```
data/
├── users/{user_id}/cookies.txt
└── downloads.db

storage/
└── {user_id}/{job_id}/
    ├── 001 - Title Video.m4a
    ├── 002 - Title Video.m4a
    └── ...
```
