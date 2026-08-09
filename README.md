<div align="center">
  <h1>YTMp3.in</h1>
  <p>
    <a href="https://ytmp3.bits.co.id" target="_blank">
      <img src="https://img.shields.io/badge/ytmp3.bits.co.id-Online-00C853?style=for-the-badge&logo=statuspage&logoColor=white" alt="ytmp3.bits.co.id Online" />
    </a>
  </p>
  <p>
    Fast YouTube audio downloader with playlist support, cookie upload, and admin controls
  </p>
  <br>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js&logoColor=white" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white" alt="Python 3.12" />
    <img src="https://img.shields.io/badge/FastAPI-0.141.1-009688?style=flat&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Celery-5.6.3-37814A?style=flat&logo=celery&logoColor=white" alt="Celery" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker Compose" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat" alt="MIT License" />
  </p>
</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **YouTube Playlist Download** | Download single videos or full playlists in one job |
| **Cookie Upload Support** | Handle members-only, private, or age-restricted content |
| **Audio Conversion** | Export audio in the configured format with yt-dlp |
| **Job Queue** | Background processing with Celery and Redis |
| **Resume & Cancel** | Resume unfinished jobs and cancel active ones |
| **User Authentication** | Register, login, refresh, logout, profile management |
| **Admin Panel** | User, job, settings, cleanup, and system stats tools |
| **Reverse Proxy Ready** | Frontend and API deployable behind Nginx or tunnel |
| **Modern UI** | Next.js app with Tailwind CSS and responsive layout |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Axios, Lucide React, React Hot Toast |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, bcrypt, python-jose |
| **Queue & Cache** | Celery, Redis |
| **Downloader** | yt-dlp with Deno impersonation support |
| **Storage** | SQLite |
| **Container** | Docker, Docker Compose, Nginx |

---

## 📁 Project Structure

```text
ytmp3.bits.co.id/
├── backend/
│   ├── main.py              # FastAPI app, auth, jobs, download endpoints
│   ├── admin_routes.py      # Admin API endpoints
│   ├── admin_utils.py       # Admin settings and helpers
│   ├── celery_app.py        # Celery configuration
│   ├── create_admin.py      # Default admin bootstrap
│   ├── models.py            # SQLAlchemy models and DB setup
│   ├── tasks.py             # Playlist download worker task
│   ├── requirements.txt     # Python dependencies
│   └── yt-dlp.conf          # yt-dlp config
├── frontend/
│   ├── src/app/             # Landing page, auth, dashboard, admin pages
│   ├── src/components/      # UI components
│   ├── package.json         # Frontend scripts and deps
│   └── Dockerfile           # Frontend container
├── nginx/
│   └── nginx.conf           # Reverse proxy config
├── data/                    # Local SQLite data and cookie storage
├── storage/                 # Download output volume
├── docker-compose.yml       # Local and production orchestration
├── .env.example             # Environment template
├── .github/workflows/       # Build and push pipeline
├── LICENSE                  # MIT license
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose v2+
- Git

### Steps

```bash
git clone https://github.com/BITS-Cloud-Platform/ytmp3.bits.co.id.git
cd ytmp3.bits.co.id
cp .env.example .env.production
```

Edit `.env.production`:

```env
DATABASE_URL=sqlite:////app/data/downloads.db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=generate-a-secure-random-key
YTDL_FORMAT=m4a
STORAGE_DIR=/app/storage
ALLOWED_ORIGINS=http://localhost:3000,https://ytmp3.bits.co.id
PASSWORD_MIN_LENGTH=8
NEXT_PUBLIC_API_URL=https://ytmp3.bits.co.id
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=change-me-immediately
```

Start services:

```bash
docker compose up -d --build
```

Access:

- App: `http://localhost:3004`
- API: `http://localhost:3004/api/...`

Build:

```bash
docker compose build
```

Deploy:

```bash
docker compose pull && docker compose up -d
```

---

## 💻 Development

### Scripts

| Command | Description |
|---------|-------------|
| `docker compose up -d --build` | Build and run full stack |
| `docker compose up -d` | Run with existing images |
| `docker compose pull` | Pull latest GHCR images |
| `docker compose logs -f` | Follow service logs |

### Local notes

- `backend/` stores SQLite schema, auth, job queue, and download logic
- `frontend/` contains Next.js UI and admin screens
- `data/` and `storage/` persist user cookies and downloaded files

---

## ⚙️ Environment Configuration

### Required variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite connection string |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY` | JWT signing secret |
| `YTDL_FORMAT` | Default output format |
| `STORAGE_DIR` | Download storage path |
| `ALLOWED_ORIGINS` | CORS allowlist |
| `PASSWORD_MIN_LENGTH` | Minimum password length |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL |
| `DEFAULT_ADMIN_EMAIL` | Seed admin email |
| `DEFAULT_ADMIN_PASSWORD` | Seed admin password |

### Production domain

`docker-compose.yml` points frontend build args to:

```env
NEXT_PUBLIC_API_URL=https://ytmp3.bits.co.id
```

Change that value if domain changes, then rebuild frontend image.

---

## 📡 API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health check |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout user |
| `GET` | `/api/auth/profile` | Current profile |
| `POST` | `/api/auth/change-password` | Change password |
| `PUT` | `/api/auth/update-profile` | Update profile |

### Cookies

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cookies/upload` | Upload cookies.txt |
| `GET` | `/api/cookies/status` | Check cookie status |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs` | List jobs |
| `POST` | `/api/jobs` | Create download job |
| `GET` | `/api/jobs/{job_id}` | Get job detail |
| `POST` | `/api/jobs/{job_id}/resume` | Resume job |
| `POST` | `/api/jobs/{job_id}/cancel` | Cancel job |
| `DELETE` | `/api/jobs/{job_id}` | Delete job |

### Download

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/download/{job_id}` | Download job output |
| `GET` | `/api/download/{job_id}/{format}` | Download in specific format |
| `GET` | `/api/download/{job_id}/mp3` | Download MP3 |
| `GET` | `/api/download/item/{item_id}` | Download item output |
| `GET` | `/api/download/item/{item_id}/{format}` | Download item in specific format |
| `GET` | `/api/download/item/{item_id}/mp3` | Download item MP3 |

### Admin

Admin routes live under `/api/admin`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | System stats |
| `GET` | `/api/admin/users` | List users |
| `GET` | `/api/admin/users/{user_id}` | User detail |
| `PUT` | `/api/admin/users/{user_id}` | Update user |
| `DELETE` | `/api/admin/users/{user_id}` | Delete user |
| `GET` | `/api/admin/jobs` | List jobs |
| `DELETE` | `/api/admin/jobs/{job_id}` | Delete job |
| `POST` | `/api/admin/jobs/{job_id}/cancel` | Cancel job |
| `POST` | `/api/admin/jobs/{job_id}/resume` | Resume job |
| `POST` | `/api/admin/cleanup` | Cleanup storage |
| `GET` | `/api/admin/settings` | List settings |
| `PUT` | `/api/admin/settings` | Update settings |
| `GET` | `/api/admin/disk` | Disk usage |

---

## 🔐 Security Notes

- Passwords hashed with bcrypt
- JWT access and refresh token flow
- Protected routes require auth cookies or bearer token
- Cookie upload enables private content access
- Download worker isolates long-running tasks
- CORS allowlist configurable by environment

---

## 📄 License

Distributed under MIT License. See `LICENSE`.

---

<div align="center">
  <strong>YTMp3.in</strong> Developed with ❤️ by <a href="https://bits.co.id"><strong>Banten IT Solutions</strong></a>
</div>
