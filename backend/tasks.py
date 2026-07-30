import os
import re
import shutil
import uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import yt_dlp
from celery_app import celery_app
from models import Session, Job, PlaylistItem

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/app/storage")
YTDL_FORMAT = os.environ.get("YTDL_FORMAT", "m4a")

os.makedirs(STORAGE_DIR, exist_ok=True)

@celery_app.task(bind=True, name="download_playlist")
def download_playlist(self, job_id: int, playlist_url: str):
    db = Session()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        db.close()
        return

    job.status = "downloading"
    job.total_items = 0
    job.completed_items = 0
    db.commit()

    # User paths
    user_cookies = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "users", str(job.user_id), "cookies.txt")
    out_dir = os.path.join(STORAGE_DIR, str(job.user_id), str(job_id))
    os.makedirs(out_dir, exist_ok=True)

    try:
        # Resume: check if we already have PlaylistItem entries
        existing_items = db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id).order_by(PlaylistItem.id).all()
        
        if existing_items:
            playlist_items = [(item, item.url) for item in existing_items]
            total_count = job.total_items or len(existing_items)
            completed_count = sum(1 for item in existing_items if item.status == "completed")
            job.completed_items = completed_count
            db.commit()
        else:
            import urllib.parse as urlparse
            parsed = urlparse.urlparse(playlist_url)
            qs = urlparse.parse_qs(parsed.query)
            if 'list' in qs:
                playlist_url = f"https://www.youtube.com/playlist?list={qs['list'][0]}"

            ydl_opts_flat = {"extract_flat": True, "quiet": True, "no_warnings": True}
            if os.path.exists(user_cookies):
                ydl_opts_flat["cookiefile"] = user_cookies

            with yt_dlp.YoutubeDL(ydl_opts_flat) as ydl:
                info = ydl.extract_info(playlist_url, download=False)
                entries = info.get("entries", [])
                if not entries:
                    entries = [info]

            total_count = len(entries)
            job.total_items = total_count
            db.commit()

            playlist_items = []
            for entry in entries:
                title = entry.get("title", "Unknown Title")
                url = entry.get("url") or entry.get("webpage_url")
                if not url and entry.get("id"):
                    url = f"https://www.youtube.com/watch?v={entry['id']}"
                item = PlaylistItem(job_id=job.id, title=title, url=url, status="queued")
                db.add(item)
                playlist_items.append((item, url))
            db.commit()
            completed_count = 0

        # Process items
        for idx, (item, url) in enumerate(playlist_items):
            if not url:
                item.status = "failed"
                item.error = "URL tidak valid"
                db.commit()
                continue

            if item.status == "completed" and item.file_path and os.path.exists(item.file_path):
                continue

            item.status = "downloading"
            item.error = None
            db.commit()

            item_out_dir = os.path.join(out_dir, f"item_{item.id}")
            os.makedirs(item_out_dir, exist_ok=True)

            ydl_opts = {
                "format": "bestaudio[ext=m4a]/bestaudio",
                "outtmpl": os.path.join(item_out_dir, "%(title)s.%(ext)s"),
                "postprocessors": [],
                "quiet": True,
                "no_warnings": True,
            }
            if YTDL_FORMAT == "mp3":
                ydl_opts["postprocessors"].append({
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                })
            if os.path.exists(user_cookies):
                ydl_opts["cookiefile"] = user_cookies

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])

                downloaded_files = os.listdir(item_out_dir)
                if not downloaded_files:
                    raise Exception("File tidak ditemukan setelah download selesai")

                fname = downloaded_files[0]
                src = os.path.join(item_out_dir, fname)
                ext = os.path.splitext(fname)[1].lstrip(".")
                safe_title = re.sub(r'[^\w\-_. ]', '', item.title).strip()[:80] or "audio"
                if total_count > 1:
                    safe_title = f"{completed_count + 1:03d} - {safe_title}"
                new_name = f"{safe_title}.{ext}"
                dst = os.path.join(out_dir, new_name)
                os.rename(src, dst)
                shutil.rmtree(item_out_dir, ignore_errors=True)

                item.filename = new_name
                item.file_path = dst
                item.file_size = os.path.getsize(dst)
                item.status = "completed"
                item.completed_at = datetime.utcnow()
                completed_count += 1
                job.completed_items = completed_count
                db.commit()

            except Exception as e:
                item.status = "failed"
                item.error = str(e)
                shutil.rmtree(item_out_dir, ignore_errors=True)
                db.commit()

        # If single video, propagate details to parent job
        if total_count == 1 and len(playlist_items) == 1:
            single_item = playlist_items[0][0]
            if single_item.status == "completed":
                job.filename = single_item.filename
                job.file_path = single_item.file_path
                job.file_size = single_item.file_size
                job.completed_items = 1

        job.status = "completed"
        job.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()
        raise
    finally:
        db.close()