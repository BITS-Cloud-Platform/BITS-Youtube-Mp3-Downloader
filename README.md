# YTMp3.in - YouTube Downloader

YouTube video and playlist downloader with multi-format audio conversion (M4A, MP3, OPUS, OGG, FLAC).

## Features

- Download single YouTube videos
- Download full playlists with progress tracking
- Multi-format audio conversion (M4A, MP3, OPUS, OGG, FLAC)
- Real-time progress tracking
- Cancel and resume downloads
- User authentication
- Anti-bot bypass using Deno runtime

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Backend**: FastAPI, SQLAlchemy, Celery
- **Queue**: Redis
- **Downloader**: yt-dlp with Deno runtime
- **Converter**: FFmpeg

## Setup

### Production (Docker Compose)

1. Copy environment file:
```bash
cp .env.example .env.production
```

2. Edit `.env.production` and set your values:
```env
DATABASE_URL=sqlite:////app/data/downloads.db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-secret-key-here
YTDL_FORMAT=m4a
STORAGE_DIR=/app/storage
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
PASSWORD_MIN_LENGTH=8
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Generate a secure `SECRET_KEY`:
```bash
openssl rand -hex 32
```

4. Start services:
```bash
docker-compose up -d
```

5. Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Development (Local)

1. Setup environment files:
```bash
# Backend environment
cp .env.development backend/.env

# Frontend environment
cp .env.development frontend/.env.local
```

2. Install Redis:
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis
```

3. Install Deno (required for yt-dlp anti-bot):
```bash
curl -fsSL https://deno.land/install.sh | sh
```

4. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

5. Install frontend dependencies:
```bash
cd frontend
npm install
```

6. Start Redis:
```bash
redis-server
```

7. Start Celery worker:
```bash
cd backend
celery -A tasks worker --loglevel=info --concurrency=2
```

8. Start backend:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

9. Start frontend:
```bash
cd frontend
npm run dev
```

10. Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Environment Files Structure

### For Local Development:
- `backend/.env` - Backend configuration (local paths, localhost Redis)
- `frontend/.env.local` - Frontend configuration
- `.env.development` - Template for development

### For Docker Production:
- `.env.production` - Docker configuration (container paths, service names)
- Environment variables are loaded from `.env.production` via docker-compose.yml

### How It Works:
The application automatically detects the environment:
- **Local**: Looks for `backend/.env` first, uses local paths
- **Docker**: Uses environment variables injected by Docker Compose from `.env.production`

## Environment Variables

### Required
- `SECRET_KEY`: JWT secret key (generate with `openssl rand -hex 32`)
- `DATABASE_URL`: SQLite database path
- `REDIS_URL`: Redis connection URL
- `STORAGE_DIR`: Directory for downloaded files
- `ALLOWED_ORIGINS`: Comma-separated CORS origins
- `NEXT_PUBLIC_API_URL`: Backend API URL for frontend

### Optional
- `PASSWORD_MIN_LENGTH`: Minimum password length (default: 8)
- `YTDL_FORMAT`: Default download format (default: m4a)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/update-profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Jobs
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new download job
- `DELETE /api/jobs/{job_id}` - Delete job
- `POST /api/jobs/{job_id}/cancel` - Cancel job
- `POST /api/jobs/{job_id}/resume` - Resume cancelled job

### Downloads
- `GET /api/download/{job_id}` - Download M4A (original)
- `GET /api/download/{job_id}/{format}` - Download converted format (mp3/opus/ogg/flac)
- `GET /api/download/item/{item_id}/{format}` - Download playlist item in format

## Docker Volumes

- `app_data`: Database and application data
- `app_storage`: Downloaded files
- `redis_data`: Redis persistence

## Troubleshooting

### Deno not found error
Ensure Deno is installed and in PATH. For Docker, rebuild the image:
```bash
docker-compose build backend worker
```

### CORS errors
Add your frontend URL to `ALLOWED_ORIGINS` in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Download timeout
Default timeout is 3 minutes per item. Large files or slow connections may timeout. Adjust in `tasks.py` if needed.

## License

MIT
