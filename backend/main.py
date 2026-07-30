import os
from fastapi import FastAPI, Depends, HTTPException, Security, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import Session as DBSession, Job, User, init_db
from tasks import download_playlist
import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////app/data/downloads.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
COOKIES_PATH = os.environ.get("COOKIES_PATH", "/app/data/cookies.txt")

app = FastAPI(title="BITS YouTube Downloader")

security = HTTPBearer(auto_error=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

class LoginRequest(BaseModel):
    email: str
    password: str

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
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.post("/api/auth/register")
def register(request: LoginRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt())
    user = User(email=request.email, password_hash=hashed.decode())
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "email": user.email}

@app.post("/api/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not bcrypt.checkpw(request.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "email": user.email}

@app.post("/api/cookies/upload")
def upload_cookies(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if not file.filename or not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt cookie files accepted")
    with open(COOKIES_PATH, "wb") as f:
        content = file.file.read()
        f.write(content)
    return {"message": "Cookies uploaded", "path": COOKIES_PATH}

@app.get("/api/cookies/status")
def cookies_status(user: User = Depends(get_current_user)):
    exists = os.path.exists(COOKIES_PATH)
    size = os.path.getsize(COOKIES_PATH) if exists else 0
    return {"cookies_loaded": exists, "size_bytes": size}

@app.get("/api/jobs")
def list_jobs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "playlist_url": j.playlist_url,
            "status": j.status,
            "filename": j.filename,
            "file_size": j.file_size,
            "total_items": j.total_items,
            "completed_items": j.completed_items,
            "error": j.error,
            "format": j.format,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]

@app.post("/api/jobs")
def submit_job(request: SubmitJobRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = Job(playlist_url=str(request.playlist_url), status="queued", format=os.environ.get("YTDL_FORMAT", "m4a"))
    db.add(job)
    db.commit()
    db.refresh(job)
    download_playlist.delay(job.id, job.playlist_url)
    return {"id": job.id, "status": "queued", "playlist_url": job.playlist_url}

@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "playlist_url": job.playlist_url,
        "status": job.status,
        "filename": job.filename,
        "file_size": job.file_size,
        "total_items": job.total_items,
        "completed_items": job.completed_items,
        "error": job.error,
        "format": job.format,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }

@app.get("/api/download/{job_id}")
def download_file(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    if not job.file_path or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return StreamingResponse(
        open(job.file_path, "rb"),
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'attachment; filename="{job.filename}"'},
    )