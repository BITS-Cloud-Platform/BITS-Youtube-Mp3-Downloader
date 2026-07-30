import os
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Security
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from models import Session as DBSession, User, Job, PlaylistItem, Settings
from admin_utils import (
    get_disk_usage,
    get_user_disk_usage,
    get_system_stats,
    cleanup_old_files,
    get_user_stats,
    get_setting,
    set_setting,
    get_all_settings,
)
from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

SECRET_KEY = os.environ.get("SECRET_KEY", "")
ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

def get_db():
    db = DBSession()
    try:
        yield db
    finally:
        db.close()

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
    db.refresh(user)
    return user

logger = logging.getLogger(__name__)
router = APIRouter()

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/app/storage")


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class CleanupRequest(BaseModel):
    days: int = 30
    dry_run: bool = False


class SettingRequest(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


@router.get("/stats")
def get_admin_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    total_jobs = db.query(func.count(Job.id)).scalar()
    
    completed_jobs = db.query(func.count(Job.id)).filter(Job.status == "completed").scalar()
    failed_jobs = db.query(func.count(Job.id)).filter(Job.status == "failed").scalar()
    queued_jobs = db.query(func.count(Job.id)).filter(Job.status == "queued").scalar()
    downloading_jobs = db.query(func.count(Job.id)).filter(Job.status == "downloading").scalar()
    
    disk_usage = get_disk_usage()
    system_stats = get_system_stats()
    
    recent_jobs = db.query(Job).order_by(desc(Job.created_at)).limit(10).all()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
        },
        "jobs": {
            "total": total_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
            "queued": queued_jobs,
            "downloading": downloading_jobs,
        },
        "disk": disk_usage,
        "system": system_stats,
        "recent_jobs": [
            {
                "id": j.id,
                "user_id": j.user_id,
                "playlist_name": j.playlist_name,
                "status": j.status,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in recent_jobs
        ],
    }


@router.get("/users")
def list_all_users(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = db.query(User).order_by(desc(User.created_at)).all()
    result = []
    
    for user in users:
        user_stats = get_user_stats(user.id)
        result.append({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "stats": user_stats,
        })
    
    return result


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    jobs = db.query(Job).filter(Job.user_id == user_id).order_by(desc(Job.created_at)).all()
    user_stats = get_user_stats(user_id)
    
    return {
        "id": target_user.id,
        "email": target_user.email,
        "name": target_user.name,
        "is_active": target_user.is_active,
        "is_admin": target_user.is_admin,
        "created_at": target_user.created_at.isoformat() if target_user.created_at else None,
        "stats": user_stats,
        "jobs": [
            {
                "id": j.id,
                "playlist_name": j.playlist_name,
                "status": j.status,
                "file_size": j.file_size,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            }
            for j in jobs
        ],
    }


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    request: UpdateUserRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.id == user.id and request.is_admin is False:
        raise HTTPException(status_code=400, detail="Cannot remove your own admin access")
    
    user_email = user.email
    target_email = target_user.email
    
    if request.name is not None:
        target_user.name = request.name
    if request.email is not None:
        existing = db.query(User).filter(User.email == request.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        target_user.email = request.email
    if request.is_active is not None:
        target_user.is_active = request.is_active
    if request.is_admin is not None:
        target_user.is_admin = request.is_admin
    
    db.commit()
    logger.info("Admin %s updated user %s", user_email, target_email)
    
    return {"message": "User updated", "user": {
        "id": target_user.id,
        "email": target_email,
        "is_active": target_user.is_active,
        "is_admin": target_user.is_admin,
    }}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user_email = user.email
    target_email = target_user.email
    
    user_dir = os.path.join(STORAGE_DIR, str(user_id))
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir, ignore_errors=True)
    
    db.query(PlaylistItem).filter(
        PlaylistItem.job_id.in_(
            db.query(Job.id).filter(Job.user_id == user_id)
        )
    ).delete(synchronize_session=False)
    
    db.query(Job).filter(Job.user_id == user_id).delete()
    db.delete(target_user)
    db.commit()
    
    logger.info("Admin %s deleted user %s", user_email, target_email)
    
    return {"message": "User deleted"}


@router.get("/jobs")
def list_all_jobs(
    limit: int = 50,
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(Job).order_by(desc(Job.created_at))
    
    if status:
        query = query.filter(Job.status == status)
    
    jobs = query.limit(limit).all()
    
    result = []
    for job in jobs:
        job_user = db.query(User).filter(User.id == job.user_id).first()
        result.append({
            "id": job.id,
            "user_email": job_user.email if job_user else "Unknown",
            "user_id": job.user_id,
            "playlist_name": job.playlist_name,
            "playlist_url": job.playlist_url,
            "status": job.status,
            "file_size": job.file_size,
            "total_items": job.total_items,
            "completed_items": job.completed_items,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        })
    
    return result


@router.post("/cleanup")
def run_cleanup(
    request: CleanupRequest,
    user: User = Depends(get_current_user),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user_email = user.email
    result = cleanup_old_files(days=request.days, dry_run=request.dry_run)
    logger.info(
        "Admin %s ran cleanup: %d jobs, %.2f GB freed (dry_run=%s)",
        user_email,
        result["deleted_jobs"],
        result["freed_gb"],
        result["dry_run"],
    )
    return result


@router.get("/settings")
def list_settings(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return get_all_settings()


@router.put("/settings")
def update_setting(
    request: SettingRequest,
    user: User = Depends(get_current_user),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    user_email = user.email
    set_setting(request.key, request.value, request.description)
    logger.info("Admin %s updated setting %s", user_email, request.key)
    return {"message": "Setting updated"}


@router.get("/disk")
def get_disk_stats(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return get_disk_usage()
