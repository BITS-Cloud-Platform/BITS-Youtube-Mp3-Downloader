import os
import shutil
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import func
from models import Session, User, Job, PlaylistItem, Settings

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/app/storage")
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")

def get_disk_usage() -> Dict:
    total, used, free = shutil.disk_usage(STORAGE_DIR)
    return {
        "total_bytes": total,
        "used_bytes": used,
        "free_bytes": free,
        "used_percent": round((used / total) * 100, 2) if total > 0 else 0,
        "total_gb": round(total / (1024**3), 2),
        "used_gb": round(used / (1024**3), 2),
        "free_gb": round(free / (1024**3), 2),
    }

def get_user_disk_usage(user_id: int) -> Dict:
    user_dir = os.path.join(STORAGE_DIR, str(user_id))
    if not os.path.exists(user_dir):
        return {"total_bytes": 0, "total_gb": 0, "file_count": 0}
    
    total_size = 0
    file_count = 0
    for root, dirs, files in os.walk(user_dir):
        for file in files:
            file_path = os.path.join(root, file)
            try:
                total_size += os.path.getsize(file_path)
                file_count += 1
            except:
                pass
    
    return {
        "total_bytes": total_size,
        "total_gb": round(total_size / (1024**3), 2),
        "file_count": file_count,
    }

def get_system_stats() -> Dict:
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    return {
        "cpu_percent": cpu_percent,
        "memory_total_bytes": memory.total,
        "memory_used_bytes": memory.used,
        "memory_percent": memory.percent,
        "memory_total_gb": round(memory.total / (1024**3), 2),
        "memory_used_gb": round(memory.used / (1024**3), 2),
    }

def cleanup_old_files(days: int = 30, dry_run: bool = False) -> Dict:
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    db = Session()
    deleted_count = 0
    freed_bytes = 0
    errors = []
    
    try:
        old_jobs = db.query(Job).filter(
            Job.completed_at < cutoff_date,
            Job.status.in_(["completed", "failed", "partial", "cancelled"])
        ).all()
        
        for job in old_jobs:
            try:
                if job.file_path and os.path.exists(job.file_path):
                    size = os.path.getsize(job.file_path)
                    if not dry_run:
                        os.remove(job.file_path)
                    freed_bytes += size
                
                items = db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id).all()
                for item in items:
                    if item.file_path and os.path.exists(item.file_path):
                        size = os.path.getsize(item.file_path)
                        if not dry_run:
                            os.remove(item.file_path)
                        freed_bytes += size
                
                job_dir = os.path.join(STORAGE_DIR, str(job.user_id), str(job.id))
                if os.path.exists(job_dir):
                    if not dry_run:
                        shutil.rmtree(job_dir, ignore_errors=True)
                
                if not dry_run:
                    db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id).delete()
                    db.delete(job)
                
                deleted_count += 1
            except Exception as e:
                errors.append(f"Job {job.id}: {str(e)}")
        
        if not dry_run:
            db.commit()
        
        return {
            "deleted_jobs": deleted_count,
            "freed_bytes": freed_bytes,
            "freed_gb": round(freed_bytes / (1024**3), 2),
            "errors": errors,
            "dry_run": dry_run,
        }
    finally:
        db.close()

def get_user_stats(user_id: int) -> Dict:
    db = Session()
    try:
        total_jobs = db.query(func.count(Job.id)).filter(Job.user_id == user_id).scalar()
        completed_jobs = db.query(func.count(Job.id)).filter(
            Job.user_id == user_id,
            Job.status == "completed"
        ).scalar()
        failed_jobs = db.query(func.count(Job.id)).filter(
            Job.user_id == user_id,
            Job.status == "failed"
        ).scalar()
        
        disk_usage = get_user_disk_usage(user_id)
        
        return {
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "failed_jobs": failed_jobs,
            "disk_usage": disk_usage,
        }
    finally:
        db.close()

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    db = Session()
    try:
        setting = db.query(Settings).filter(Settings.key == key).first()
        return setting.value if setting else default
    finally:
        db.close()

def set_setting(key: str, value: str, description: Optional[str] = None):
    db = Session()
    try:
        setting = db.query(Settings).filter(Settings.key == key).first()
        if setting:
            setting.value = value
            setting.updated_at = datetime.utcnow()
            if description:
                setting.description = description
        else:
            setting = Settings(key=key, value=value, description=description)
            db.add(setting)
        db.commit()
    finally:
        db.close()

def get_all_settings() -> List[Dict]:
    db = Session()
    try:
        settings = db.query(Settings).all()
        return [
            {
                "key": s.key,
                "value": s.value,
                "description": s.description,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in settings
        ]
    finally:
        db.close()

def init_default_settings():
    defaults = [
        ("cleanup_retention_days", "30", "Number of days to keep completed jobs"),
        ("max_file_size_mb", "500", "Maximum file size in MB per download"),
        ("auto_cleanup_enabled", "false", "Enable automatic cleanup"),
    ]
    
    for key, value, description in defaults:
        if not get_setting(key):
            set_setting(key, value, description)
