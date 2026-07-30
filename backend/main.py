import os
import re
import time
import subprocess
import shutil
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, Security, UploadFile, File, Request, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session
from models import Session as DBSession, Job, PlaylistItem, User, init_db
from tasks import download_playlist
import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////app/data/downloads.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "")
if SECRET_KEY == "" or SECRET_KEY == "change-me-in-production":
    raise RuntimeError("SECRET_KEY must be set to a secure random value in .env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30
COOKIES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "users")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
PASSWORD_MIN_LENGTH = int(os.environ.get("PASSWORD_MIN_LENGTH", "8"))

security = HTTPBearer(auto_error=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from admin_utils import init_default_settings
    from create_admin import create_default_admin
    init_default_settings()
    create_default_admin()
    yield


app = FastAPI(title="YTMp3.in", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

from admin_routes import router as admin_router
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
        return v


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
        return v


class UpdateProfileRequest(BaseModel):
    name: str


class SubmitJobRequest(BaseModel):
    playlist_url: str


def get_db():
    db = DBSession()
    try:
        yield db
    finally:
        db.close()


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth",
    )


def delete_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
):
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/auth/register")
def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt())
    user = User(email=request.email, name=request.name, password_hash=hashed.decode())
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    set_auth_cookies(response, access_token, refresh_token)
    logger.info("User registered: %s (%s)", user.email, user.name)
    return {"message": "Registered", "email": user.email, "name": user.name, "access_token": access_token}


@app.post("/api/auth/login")
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not bcrypt.checkpw(request.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    set_auth_cookies(response, access_token, refresh_token)
    logger.info("User logged in: %s", user.email)
    return {"message": "Logged in", "email": user.email, "access_token": access_token}


@app.post("/api/auth/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or disabled")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    set_auth_cookies(response, access_token, refresh_token)
    return {"message": "Token refreshed"}


@app.post("/api/auth/logout")
def logout(response: Response):
    delete_auth_cookies(response)
    return {"message": "Logged out"}


@app.get("/api/auth/profile")
def profile(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@app.post("/api/auth/change-password")
def change_password(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not bcrypt.checkpw(request.old_password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    hashed = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt())
    user.password_hash = hashed.decode()
    db.commit()
    logger.info("Password changed for: %s", user.email)
    return {"message": "Password changed"}


@app.put("/api/auth/update-profile")
def update_profile(
    request: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.name = request.name
    db.commit()
    logger.info("Profile updated for: %s", user.email)
    return {"message": "Profile updated", "name": user.name}


@app.post("/api/cookies/upload")
def upload_cookies(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if not file.filename or not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt cookie files accepted")
    user_dir = os.path.join(COOKIES_DIR, str(user.id))
    os.makedirs(user_dir, exist_ok=True)
    user_path = os.path.join(user_dir, "cookies.txt")
    with open(user_path, "wb") as f:
        content = file.file.read()
        f.write(content)
    logger.info("Cookies uploaded for user: %s", user.email)
    return {"message": "Cookies uploaded"}


@app.get("/api/cookies/status")
def cookies_status(user: User = Depends(get_current_user)):
    user_dir = os.path.join(COOKIES_DIR, str(user.id))
    user_path = os.path.join(user_dir, "cookies.txt")
    exists = os.path.exists(user_path)
    size = os.path.getsize(user_path) if exists else 0
    return {"cookies_loaded": exists, "size_bytes": size}


@app.get("/api/jobs")
def list_jobs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.user_id == user.id).order_by(Job.created_at.desc()).all()
    res = []
    for j in jobs:
        items = db.query(PlaylistItem).filter(PlaylistItem.job_id == j.id).all()
        item_statuses = [item.status for item in items]
        derived_status = j.status
        if j.status == "completed" and item_statuses:
            failed = any(s == "failed" for s in item_statuses)
            completed = any(s == "completed" for s in item_statuses)
            if failed and completed:
                derived_status = "partial"
            elif failed and not completed:
                derived_status = "failed"
        res.append({
            "id": j.id,
            "playlist_url": j.playlist_url,
            "playlist_name": j.playlist_name,
            "status": derived_status,
            "filename": j.filename,
            "file_size": j.file_size,
            "total_items": j.total_items,
            "completed_items": j.completed_items,
            "error": j.error,
            "format": j.format,
            "progress": j.progress,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            "items": [
                {
                    "id": item.id,
                    "title": item.title,
                    "status": item.status,
                    "file_size": item.file_size,
                    "error": item.error,
                    "completed_at": item.completed_at.isoformat() if item.completed_at else None,
                }
                for item in items
            ]
        })
    return res


@app.post("/api/jobs")
def submit_job(request: SubmitJobRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = Job(
        user_id=user.id,
        playlist_url=str(request.playlist_url),
        status="queued",
        format=os.environ.get("YTDL_FORMAT", "m4a"),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    download_playlist.delay(job.id, job.playlist_url)
    logger.info("Job submitted by %s: %s", user.email, job.playlist_url)
    return {"id": job.id, "status": "queued", "playlist_url": job.playlist_url}


@app.post("/api/jobs/{job_id}/resume")
def resume_job(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.status = "queued"
    db.commit()
    download_playlist.delay(job.id, job.playlist_url)
    logger.info("Job resumed by %s: %s", user.email, job.playlist_url)
    return {"message": "Job resumed", "id": job.id}


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("queued", "downloading"):
        raise HTTPException(status_code=400, detail="Job tidak sedang berjalan")

    job.status = "cancelled"
    job.error = "Dibatalkan oleh pengguna"
    db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id, PlaylistItem.status == "downloading").update({"status": "queued"})
    db.commit()
    logger.info("Job cancelled by %s: %s", user.email, job.playlist_url)
    return {"message": "Job cancelled", "id": job.id}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    items = db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id).all()
    item_statuses = [item.status for item in items]
    derived_status = job.status
    if job.status == "completed" and item_statuses:
        failed = any(s == "failed" for s in item_statuses)
        completed = any(s == "completed" for s in item_statuses)
        if failed and completed:
            derived_status = "partial"
        elif failed and not completed:
            derived_status = "failed"
    return {
        "id": job.id,
        "playlist_url": job.playlist_url,
        "playlist_name": job.playlist_name,
        "status": derived_status,
        "filename": job.filename,
        "file_size": job.file_size,
        "total_items": job.total_items,
        "completed_items": job.completed_items,
        "error": job.error,
        "format": job.format,
        "progress": job.progress,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "items": [
            {
                "id": item.id,
                "title": item.title,
                "status": item.status,
                "file_size": item.file_size,
                "error": item.error,
                "completed_at": item.completed_at.isoformat() if item.completed_at else None,
            }
            for item in items
        ]
    }


@app.get("/api/download/{job_id}")
def download_file(
    job_id: int,
    request: Request,
    token: Optional[str] = None,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    if not job.file_path or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return StreamingResponse(
        open(job.file_path, "rb"),
        media_type="audio/mp4",
        headers={"Content-Disposition": f'attachment; filename="{job.filename}"'},
    )


@app.get("/api/download/{job_id}/{format}")
def download_file_format(
    job_id: int,
    format: str,
    token: Optional[str] = None,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate format
    format_config = {
        "mp3": {"ext": "mp3", "codec": "libmp3lame", "bitrate": "64k", "mime": "audio/mpeg"},
        "m4a": {"ext": "m4a", "codec": "aac", "bitrate": "128k", "mime": "audio/mp4"},
        "opus": {"ext": "opus", "codec": "libopus", "bitrate": "64k", "mime": "audio/ogg"},
        "ogg": {"ext": "ogg", "codec": "libvorbis", "bitrate": "128k", "mime": "audio/ogg"},
        "flac": {"ext": "flac", "codec": "flac", "bitrate": None, "mime": "audio/flac"},
        "wav": {"ext": "wav", "codec": "pcm_s16le", "bitrate": None, "mime": "audio/wav"},
    }
    
    if format not in format_config:
        raise HTTPException(status_code=400, detail="Format not supported")
    
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    if not job.file_path or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if source file is already in requested format
    source_ext = os.path.splitext(job.file_path)[1].lstrip(".")
    target_filename = os.path.splitext(job.filename or "audio")[0] + f".{format_config[format]['ext']}"
    
    # If already in target format, return directly
    if source_ext == format_config[format]['ext']:
        return StreamingResponse(
            open(job.file_path, "rb"),
            media_type=format_config[format]['mime'],
            headers={"Content-Disposition": f'attachment; filename="{target_filename}"'},
        )
    
    # Convert using ffmpeg
    ffmpeg_path = os.path.join(os.path.dirname(__file__), "ffmpeg")
    cfg = format_config[format]
    
    def iter_converted():
        cmd = [ffmpeg_path, "-i", job.file_path]
        if cfg['codec']:
            cmd.extend(["-acodec", cfg['codec']])
        if cfg['bitrate']:
            cmd.extend(["-b:a", cfg['bitrate']])
        cmd.extend(["-f", cfg['ext'], "-y", "pipe:1"])
        
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            yield chunk
        proc.wait()
    
    return StreamingResponse(
        iter_converted(),
        media_type=cfg['mime'],
        headers={"Content-Disposition": f'attachment; filename="{target_filename}"'},
    )


@app.get("/api/download/{job_id}/mp3")
def download_file_mp3(
    job_id: int,
    token: Optional[str] = None,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    if not job.file_path or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    mp3_filename = os.path.splitext(job.filename or "audio")[0] + ".mp3"
    ffmpeg_path = os.path.join(os.path.dirname(__file__), "ffmpeg")
    def iter_mp3():
        proc = subprocess.Popen(
            [ffmpeg_path, "-i", job.file_path, "-b:a", "64k", "-f", "mp3", "-y", "pipe:1"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        )
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            yield chunk
        proc.wait()
    return StreamingResponse(
        iter_mp3(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'attachment; filename="{mp3_filename}"'},
    )


@app.get("/api/download/item/{item_id}")
def download_playlist_item(
    item_id: int,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    item = db.query(PlaylistItem).filter(PlaylistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    job = db.query(Job).filter(Job.id == item.job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=403, detail="Access denied")
    if item.status != "completed":
        raise HTTPException(status_code=400, detail="Item not completed")
    if not item.file_path or not os.path.exists(item.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    ext = os.path.splitext(item.file_path)[1].lstrip(".")
    safe_title = re.sub(r'[^\w\-_.]', '_', item.title)
    filename = f"{safe_title}.{ext}"
    return StreamingResponse(
        open(item.file_path, "rb"),
        media_type="audio/mp4",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/download/item/{item_id}/{format}")
def download_playlist_item_format(
    item_id: int,
    format: str,
    token: Optional[str] = None,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate format
    format_config = {
        "mp3": {"ext": "mp3", "codec": "libmp3lame", "bitrate": "64k", "mime": "audio/mpeg"},
        "m4a": {"ext": "m4a", "codec": "aac", "bitrate": "128k", "mime": "audio/mp4"},
        "opus": {"ext": "opus", "codec": "libopus", "bitrate": "64k", "mime": "audio/ogg"},
        "ogg": {"ext": "ogg", "codec": "libvorbis", "bitrate": "128k", "mime": "audio/ogg"},
        "flac": {"ext": "flac", "codec": "flac", "bitrate": None, "mime": "audio/flac"},
        "wav": {"ext": "wav", "codec": "pcm_s16le", "bitrate": None, "mime": "audio/wav"},
    }
    
    if format not in format_config:
        raise HTTPException(status_code=400, detail="Format not supported")
    
    item = db.query(PlaylistItem).filter(PlaylistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    job = db.query(Job).filter(Job.id == item.job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=403, detail="Access denied")
    if item.status != "completed":
        raise HTTPException(status_code=400, detail="Item not completed")
    if not item.file_path or not os.path.exists(item.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if source file is already in requested format
    source_ext = os.path.splitext(item.file_path)[1].lstrip(".")
    safe_title = re.sub(r'[^\w\-_.]', '_', item.title)
    target_filename = f"{safe_title}.{format_config[format]['ext']}"
    
    # If already in target format, return directly
    if source_ext == format_config[format]['ext']:
        return StreamingResponse(
            open(item.file_path, "rb"),
            media_type=format_config[format]['mime'],
            headers={"Content-Disposition": f'attachment; filename="{target_filename}"'},
        )
    
    # Convert using ffmpeg
    ffmpeg_path = os.path.join(os.path.dirname(__file__), "ffmpeg")
    cfg = format_config[format]
    
    def iter_converted():
        cmd = [ffmpeg_path, "-i", item.file_path]
        if cfg['codec']:
            cmd.extend(["-acodec", cfg['codec']])
        if cfg['bitrate']:
            cmd.extend(["-b:a", cfg['bitrate']])
        cmd.extend(["-f", cfg['ext'], "-y", "pipe:1"])
        
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            yield chunk
        proc.wait()
    
    return StreamingResponse(
        iter_converted(),
        media_type=cfg['mime'],
        headers={"Content-Disposition": f'attachment; filename="{target_filename}"'},
    )


@app.get("/api/download/item/{item_id}/mp3")
def download_playlist_item_mp3(
    item_id: int,
    token: Optional[str] = None,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    item = db.query(PlaylistItem).filter(PlaylistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    job = db.query(Job).filter(Job.id == item.job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=403, detail="Access denied")
    if item.status != "completed":
        raise HTTPException(status_code=400, detail="Item not completed")
    if not item.file_path or not os.path.exists(item.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    safe_title = re.sub(r'[^\w\-_.]', '_', item.title)
    mp3_filename = f"{safe_title}.mp3"
    ffmpeg_path = os.path.join(os.path.dirname(__file__), "ffmpeg")
    def iter_mp3():
        proc = subprocess.Popen(
            [ffmpeg_path, "-i", item.file_path, "-b:a", "64k", "-f", "mp3", "-y", "pipe:1"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        )
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            yield chunk
        proc.wait()
    return StreamingResponse(
        iter_mp3(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'attachment; filename="{mp3_filename}"'},
    )


@app.delete("/api/jobs/{job_id}")
def delete_job(
    job_id: int,
    token: Optional[str] = None,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Delete files
    storage_dir = os.environ.get("STORAGE_DIR", "/app/storage")
    job_dir = os.path.join(storage_dir, str(user.id), str(job_id))
    if os.path.exists(job_dir):
        shutil.rmtree(job_dir, ignore_errors=True)
    # Delete DB entries
    db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id).delete()
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}
