<div align="center">
  <h1>YTMp3.in</h1>
  <p><strong>YouTube Audio Downloader</strong></p>
  <p>
    <a href="https://ytmp3.bits.co.id" target="_blank">ytmp3.bits.co.id</a> ·
    <a href="https://bits.co.id" target="_blank">Banten IT Solutions</a>
  </p>
  <p>
    Download, Convert, Enjoy — Free & Fast YouTube to MP3/M4A Converter
  </p>
  <br>
  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js" alt="Next.js 15" />
    <img src="https://img.shields.io/badge/Python-3.12-blue?style=flat&logo=python" alt="Python 3.12" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker" alt="Docker Compose" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat" alt="MIT License" />
    <img src="https://img.shields.io/badge/status-live-success" alt="Status Live" />
  </p>
</div>

---

## 📋 Table of Contents

- [Features](#features)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Development](#development)
- [Environment Configuration](#environment-configuration)
- [API Endpoints](#api-endpoints)
- [Admin Panel](#admin-panel)
- [Docker Volumes](#docker-volumes)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [License](#license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Download YouTube Videos & Playlists** | Single video or full playlist with progress tracking |
| **Multi-Format Audio Conversion** | M4A (original), MP3, OPUS, OGG, FLAC |
| **Real-Time Progress** | Live download and conversion progress updates |
| **Cancel & Resume** | Cancel ongoing downloads and resume them later |
| **User Authentication** | Register, login, profile management with JWT |
| **Admin Dashboard** | User management, job monitoring, disk usage, system stats |
| **Anti-Bot Protection** | Bypass YouTube bot detection using Deno runtime |
| **Docker Support** | One-command deployment with Docker Compose |
| **Responsive UI** | Modern, mobile-friendly interface built with TailwindCSS |

---

## 🌐 Live Demo

The application is live and running at:

<div align="center">
  <a href="https://ytmp3.bits.co.id" style="font-size: 1.5em; font-weight: bold;">
    🔗 https://ytmp3.bits.co.id
  </a>
</div>

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, TailwindCSS |
| **Backend** | FastAPI (Python 3.12), SQLAlchemy, Celery |
| **Queue & Cache** | Redis 7 |
| **Downloader** | yt-dlp with Deno runtime (anti-bot) |
| **Converter** | FFmpeg |
| **Auth** | JWT (access + refresh tokens) + bcrypt |
| **Container** | Docker & Docker Compose |
| **Reverse Proxy** | Nginx |

---

## 📁 Project Structure

```
ytmp3/
├── backend/
│   ├── main.py              # FastAPI application & routes
│   ├── models.py            # SQLAlchemy database models
│   ├── tasks.py             # Celery async tasks
│   ├── admin_routes.py      # Admin API endpoints
│   ├── admin_utils.py       # Admin utility functions
│   ├── create_admin.py      # Default admin auto-creator
│   ├── celery_app.py        # Celery configuration
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Backend & worker container
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── login/              # Login page
│   │   │   ├── signup/             # Registration
│   │   │   ├── dashboard/          # User dashboard
│   │   │   ├── profile/            # User profile
│   │   │   └── admin/              # Admin panel
│   │   │       ├── page.tsx        # Dashboard overview
│   │   │       ├── users/          # User management
│   │   │       ├── jobs/           # Job monitoring
│   │   │       └── settings/       # System settings
│   │   ├── components/             # Shared UI components
│   │   └── globals.css             # Global styles
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── nginx.conf            # Nginx reverse proxy config
├── data/                     # SQLite database — local dev only (gitignored)
├── storage/                  # Downloaded files — local dev only (gitignored)
├── docker-compose.yml        # Docker orchestration
├── .env.example              # Env template (committed to repo)
├── .env.development          # Local dev config (gitignored)
├── .env.production           # Production config, read by docker compose (gitignored)
└── .gitignore
```

---

## 🚀 Quick Start (Docker)

The fastest way to deploy the project in production:

### Prerequisites

- Docker & Docker Compose v2+
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/BITS-Cloud-Platform/ytmp3.bits.co.id.git
cd ytmp3.bits.co.id

# 2. Copy the production environment template
cp .env.example .env.production

# 3. Edit the production environment
#    IMPORTANT: Generate a strong SECRET_KEY (see below)
nano .env.production
```

**Generate a secure SECRET_KEY:**
```bash
openssl rand -hex 32
```

**.env.production reference:**
```env
DATABASE_URL=sqlite:////app/data/downloads.db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=generate-a-secure-random-key-here
YTDL_FORMAT=m4a
STORAGE_DIR=/app/storage
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
PASSWORD_MIN_LENGTH=8
NEXT_PUBLIC_API_URL=https://yourdomain.com
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=change-me-immediately
```

> **Note:** `NEXT_PUBLIC_API_URL` is a Next.js **build-time** variable. In `docker-compose.yml` it is passed as a build arg (`args: NEXT_PUBLIC_API_URL: https://ytmp3.bits.co.id`), not read from `.env.production`. To change it, edit `docker-compose.yml` and rebuild: `docker compose build frontend`.

```bash
# 4. Start all services
docker compose up -d

# 5. Access the application (single entrypoint via nginx)
#    App : http://localhost:3004
#    API : http://localhost:3004/api/...
```

> **Note:** Only nginx exposes a host port (`3004 → 80`). `frontend` and `backend` have no host ports (`ports: []`) — they are reachable only inside the Docker network. All API requests go through nginx.

### Docker Services

| Service | Image/Build | Host Port | Internal Port | Description |
|---------|-------------|-----------|---------------|-------------|
| `nginx` | `nginx:alpine` | `3004` | 80 | Reverse proxy (routes `/api/` & `/download/` → backend, rest → frontend) |
| `frontend` | `./frontend` (Dockerfile) | — | 3000 | Next.js UI |
| `backend` | `./backend` (Dockerfile) | — | 8000 | FastAPI server |
| `worker` | `./backend` (Dockerfile) | — | — | Celery async worker (`--concurrency=2`) |
| `redis` | `redis:7-alpine` | — | 6379 | Queue & cache |

---

## 💻 Development

### Prerequisites

- Python 3.12+
- Node.js 18+
- Redis 7+
- Deno (for yt-dlp anti-bot)
- FFmpeg

### 1. Clone & Setup Environment

```bash
git clone https://github.com/BITS-Cloud-Platform/ytmp3.bits.co.id.git
cd ytmp3.bits.co.id

# Backend environment — copy local dev template, then adjust paths
cp .env.development backend/.env
```

**.env (backend) reference — local dev:**
```env
DATABASE_URL=sqlite:///./data/downloads.db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=dev-secret-key-change-in-production
YTDL_FORMAT=m4a
STORAGE_DIR=./storage
ALLOWED_ORIGINS=http://localhost:3000
PASSWORD_MIN_LENGTH=8
```

```bash
# Frontend environment
cp .env.development frontend/.env.local
```

**frontend/.env.local reference — local dev:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Install Redis

```bash
# Ubuntu / Debian
sudo apt install redis-server

# macOS
brew install redis
```

### 3. Install Deno

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 4. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Frontend Setup

```bash
cd frontend
npm install
```

### 6. Run Services

Open separate terminals for each service:

**Terminal 1 — Redis:**
```bash
redis-server
```

**Terminal 2 — Celery Worker:**
```bash
cd backend
source .venv/bin/activate
export PATH="$HOME/.deno/bin:$PATH"
celery -A tasks worker --loglevel=info --concurrency=2
```

**Terminal 3 — Backend:**
```bash
cd backend
source .venv/bin/activate
export PATH="$HOME/.deno/bin:$PATH"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 4 — Frontend:**
```bash
cd frontend
npm run dev
```

### 7. Access

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000

---

## ⚙️ Environment Configuration

### How Env Files Are Loaded

**Backend** loads `backend/.env` if it exists, otherwise falls back to environment variables already set:

```python
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)    # Local development
else:
    load_dotenv()            # Docker / production (env vars from compose)
```

**Docker Compose** reads the root `.env.production` via `env_file:` and injects its values as container environment variables. The root `.env.development` / `.env.production` files are **not** auto-loaded by the backend — they are consumed by compose (or copied into `backend/.env` for local dev).

### File Structure

```
ytmp3/
├── .env.example            # Template — committed to repo
├── .env.development        # Local dev config — gitignored (copy → backend/.env, frontend/.env.local)
├── .env.production         # Production config — gitignored (read by docker-compose.yml)
├── backend/
│   └── .env               # Backend local dev — gitignored, auto-loaded by backend
└── frontend/
    └── .env.local         # Frontend local dev — gitignored, read by Next.js
```

### Required Environment Variables

| Variable | Description | Example (local dev) | Example (Docker) |
|----------|-------------|---------------------|-------------------|
| `DATABASE_URL` | SQLite database path | `sqlite:///./data/downloads.db` | `sqlite:////app/data/downloads.db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT signing secret | `openssl rand -hex 32` | `openssl rand -hex 32` |
| `STORAGE_DIR` | Download storage path | `./storage` | `/app/storage` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` | `https://ytmp3.bits.co.id` |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend | `http://localhost:8000` | build arg in `docker-compose.yml` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PASSWORD_MIN_LENGTH` | Minimum password length | `8` |
| `YTDL_FORMAT` | Default download format | `m4a` |
| `DEFAULT_ADMIN_EMAIL` | Auto-created admin email | `admin@mail.com` |
| `DEFAULT_ADMIN_PASSWORD` | Auto-created admin password | `change-me` |

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/profile` | Get user profile |
| `PUT` | `/api/auth/update-profile` | Update profile |
| `POST` | `/api/auth/change-password` | Change password |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs` | List all jobs |
| `POST` | `/api/jobs` | Create new download job |
| `DELETE` | `/api/jobs/{job_id}` | Delete job |
| `POST` | `/api/jobs/{job_id}/cancel` | Cancel job |
| `POST` | `/api/jobs/{job_id}/resume` | Resume cancelled job |

### Downloads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/download/{job_id}` | Download M4A (original) |
| `GET` | `/api/download/{job_id}/{format}` | Download converted format |
| `GET` | `/api/download/item/{item_id}/{format}` | Download playlist item |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Dashboard overview |
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/users/{id}` | User details |
| `PUT` | `/api/admin/users/{id}` | Update user |
| `DELETE` | `/api/admin/users/{id}` | Delete user & files |
| `GET` | `/api/admin/jobs` | List all jobs with filters |
| `POST` | `/api/admin/cleanup` | Run file cleanup |
| `GET` | `/api/admin/settings` | List settings |
| `PUT` | `/api/admin/settings` | Update settings |
| `GET` | `/api/admin/disk` | Disk usage stats |

---

## 🔐 Admin Panel

The application includes a full-featured admin dashboard accessible to users with admin privileges.

### Default Admin Account

On first startup, a default admin account is automatically created:

```
Email:    (set via DEFAULT_ADMIN_EMAIL in .env)
Password: (set via DEFAULT_ADMIN_PASSWORD in .env)
```

> **⚠️ IMPORTANT:** Change the default password immediately after first login!

### Accessing the Admin Panel

1. Log in with admin credentials
2. Click the **Shield icon** in the dashboard
3. Navigate to **Users**, **Jobs**, or **Settings**

### Admin Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview stats (users, jobs, disk, CPU/RAM) |
| **User Management** | List users, toggle active/admin status, delete users |
| **Job Monitoring** | View all jobs across users, filter by status |
| **Settings** | Configure retention days, max file size, auto-cleanup |
| **File Cleanup** | Dry-run preview, delete old files by retention policy |
| **Disk Usage** | Per-user and total storage analytics |

### Default Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `cleanup_retention_days` | `30` | Days to keep completed jobs |
| `max_file_size_mb` | `500` | Maximum download size |
| `auto_cleanup_enabled` | `false` | Automatic cleanup toggle |

### Security Notes for Admin

- All admin routes verify the `is_admin` flag
- Admins cannot remove their own admin access
- Admins cannot delete their own account
- User deletion permanently removes all associated files and jobs
- Cleanup has a dry-run mode for safety

---

## 📦 Docker Volumes

| Volume | Mount | Description |
|--------|-------|-------------|
| `app_data` | `/app/data` | SQLite database & app data |
| `app_storage` | `/app/storage` | Downloaded audio files |
| `redis_data` | `/data` | Redis persistence |

Shared between `backend` and `worker` (both mount `app_data` and `app_storage`) so both see the same DB and downloaded files. On the host, volumes live under `/var/lib/docker/volumes/ytmp3_*`. The gitignored `data/` and `storage/` folders at the project root are **not** used by Docker — they are for local dev only.

---

## 🔧 Troubleshooting

### Deno Not Found

Ensure Deno is installed and in your PATH. For Docker, rebuild the image:

```bash
docker compose build backend worker
```

### CORS Errors

Add your frontend URL to `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Download Timeout

Default timeout is 3 minutes per item. For large files or slow connections, adjust the timeout in `backend/tasks.py`.

### Database or Storage Path Issues

- **Local dev only**: ensure `data/` and `storage/` directories exist in the project root:
  ```bash
  mkdir -p data storage
  ```
  Docker does **not** need this — named volumes are created automatically on first `docker compose up`.
- Check `DATABASE_URL` and `STORAGE_DIR` in your environment file
- For Docker, verify paths use container paths (`/app/...`)

---

## 🛡️ Security Notes

- **SECRET_KEY** must be a cryptographically random value generated with `openssl rand -hex 32`
- **Never commit real `.env` files** to version control
- Change default admin credentials immediately after deployment
- All passwords are hashed using bcrypt before storage
- JWT tokens expire; refresh tokens are used for seamless re-authentication
- Admin routes are protected by role-based access control (`is_admin` flag)
- CORS is enforced; only origins in `ALLOWED_ORIGINS` can access the API
- The `.gitignore` is configured to exclude all sensitive files

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>
    <strong>YTMp3.in</strong> ·
    <a href="https://ytmp3.bits.co.id">ytmp3.bits.co.id</a> ·
    <a href="https://bits.co.id">bits.co.id</a>
  </p>
  <p>
    Made with ❤️ by <a href="https://bits.co.id"><strong>Banten IT Solutions</strong></a>
  </p>
  <br>
  <p>
    <img src="https://img.shields.io/badge/status-live-success" alt="Status">
    <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
    <img src="https://img.shields.io/badge/docker-ready-2496ED?logo=docker" alt="Docker">
  </p>
</div>
