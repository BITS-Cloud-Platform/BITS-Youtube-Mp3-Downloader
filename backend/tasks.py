import os
import shutil
import uuid
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import yt_dlp
from celery_app import celery_app
from models import Session, Job

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/app/storage")
YTDL_FORMAT = os.environ.get("YTDL_FORMAT", "m4a")
COOKIES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "cookies")

os.makedirs(STORAGE_DIR, exist_ok=True)

@celery_app.task(bind=True, name="download_playlist")
def download_playlist(self, job_id: int, playlist_url: str):
    db = Session()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return

    job.status = "downloading"
    job.total_items = 0
    job.completed_items = 0
    db.commit()

    out_dir = os.path.join(STORAGE_DIR, str(job_id))
    os.makedirs(out_dir, exist_ok=True)

    total = 0
    completed = 0

    def progress_hook(d):
        nonlocal total, completed
        if d["status"] == "download":
            total += 1
        elif d["status"] == "finished":
            completed += 1
            j = db.query(Job).filter(Job.id == job_id).first()
            if j:
                j.completed_items = completed
                db.commit()

    ydl_opts = {
        "format": f"bestaudio/best",
        "outtmpl": os.path.join(out_dir, "%(title)s.%(ext)s"),
        "postprocessors": [],
        "logger": type("Logger", (), {
            "debug": lambda s, msg: None,
            "warning": lambda s, msg: None,
            "error": lambda s, msg: None,
        })(),
        "progress_hooks": [progress_hook],
        "quiet": True,
        "no_warnings": True,
    }

    user_cookies = os.path.join(COOKIES_DIR, f"{job.user_id}.txt")
    if os.path.exists(user_cookies):
        ydl_opts["cookiefile"] = user_cookies

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=True)
            job.total_items = len(info.get("entries", [info])) if "entries" in info else 1

        for fname in os.listdir(out_dir):
            src = os.path.join(out_dir, fname)
            ext = os.path.splitext(fname)[1].lstrip(".")
            new_name = f"{uuid.uuid4().hex}.{ext}"
            dst = os.path.join(out_dir, new_name)
            os.rename(src, dst)
            job.filename = new_name
            job.file_path = dst
            job.file_size = os.path.getsize(dst)
            job.status = "completed"
            job.completed_items = job.total_items
            job.completed_at = __import__("datetime").datetime.utcnow()
            db.commit()
            return {"job_id": job_id, "filename": new_name, "path": dst, "format": ext}

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.completed_at = __import__("datetime").datetime.utcnow()
        db.commit()
        raise
    finally:
        db.close()