import os
import re
import shutil
import uuid
import logging
import signal
from datetime import datetime
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# Add deno to PATH for yt-dlp (check both Docker and local paths)
deno_paths = ["/usr/local/bin", "/home/bits/.deno/bin"]
for deno_path in deno_paths:
    if os.path.exists(os.path.join(deno_path, "deno")):
        os.environ['PATH'] = f"{deno_path}:{os.environ.get('PATH', '')}"
        break

logger = logging.getLogger(__name__)

class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException("Download timeout")

def with_timeout(seconds):
    def decorator(func):
        def wrapper(*args, **kwargs):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(seconds)
            try:
                result = func(*args, **kwargs)
            finally:
                signal.alarm(0)
            return result
        return wrapper
    return decorator

import yt_dlp
from yt_dlp.networking.impersonate import ImpersonateTarget
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
    job.progress = None
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
            job.total_items = total_count
            completed_count = sum(1 for item in existing_items if item.status == "completed")
            job.completed_items = completed_count
            if not job.playlist_name and total_count > 1:
                try:
                    import urllib.parse as urlparse
                    parsed = urlparse.urlparse(playlist_url)
                    qs = urlparse.parse_qs(parsed.query)
                    if 'list' in qs:
                        list_url = f"https://www.youtube.com/playlist?list={qs['list'][0]}"
                        ydl_opts = {"extract_flat": True, "quiet": True, "no_warnings": True, "impersonate": ImpersonateTarget.from_str("chrome")}
                        if os.path.exists(user_cookies):
                            ydl_opts["cookiefile"] = user_cookies
                        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                            info = ydl.extract_info(list_url, download=False)
                            title = info.get("title") or info.get("playlist_title")
                            if title:
                                job.playlist_name = title
                                db.commit()
                except Exception:
                    pass
            db.commit()
        else:
            import urllib.parse as urlparse
            parsed = urlparse.urlparse(playlist_url)
            qs = urlparse.parse_qs(parsed.query)

            if 'list' in qs:
                playlist_url = f"https://www.youtube.com/playlist?list={qs['list'][0]}"
                ydl_opts_flat = {"extract_flat": True, "quiet": True, "no_warnings": True, "impersonate": ImpersonateTarget.from_str("chrome")}
                if os.path.exists(user_cookies):
                    ydl_opts_flat["cookiefile"] = user_cookies

                with yt_dlp.YoutubeDL(ydl_opts_flat) as ydl:
                    info = ydl.extract_info(playlist_url, download=False)
                    entries = info.get("entries", [])
                    playlist_title = info.get("title") or info.get("playlist_title")
                    if playlist_title:
                        job.playlist_name = playlist_title
                        db.commit()

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
            else:
                total_count = 1
                job.total_items = 1
                try:
                    ydl_opts_title = {"quiet": True, "no_warnings": True, "extract_flat": True, "impersonate": ImpersonateTarget.from_str("chrome")}
                    if os.path.exists(user_cookies):
                        ydl_opts_title["cookiefile"] = user_cookies
                    with yt_dlp.YoutubeDL(ydl_opts_title) as ydl:
                        info = ydl.extract_info(playlist_url, download=False)
                        video_title = info.get("title") or "Video"
                        job.playlist_name = video_title
                        db.commit()
                except Exception:
                    pass
                db.commit()
                item = PlaylistItem(job_id=job.id, title=job.playlist_name or "", url=playlist_url, status="queued")
                db.add(item)
                db.commit()
                playlist_items = [(item, playlist_url)]
            completed_count = 0

        # Process items
        job.progress = f"Memproses {total_count} item..."
        logger.info("Memproses %d item untuk job %d", total_count, job.id)
        db.commit()
        for idx, (item, url) in enumerate(playlist_items):
            db.refresh(job)
            if job.status == "cancelled":
                logger.info("Job %d dibatalkan, hentikan proses", job.id)
                break
            job.progress = f"Mengunduh {completed_count + 1}/{total_count}: {item.title or '...'}"
            logger.info("[%d/%d] %s", completed_count + 1, total_count, item.title or '...')
            db.commit()
            if not url:
                item.status = "failed"
                item.error = "URL tidak valid"
                db.commit()
                continue

            if item.status == "completed" and item.file_path and os.path.exists(item.file_path):
                logger.info("  [%d/%d] Sudah selesai, lewati", completed_count + 1, total_count)
                continue

            item.status = "downloading"
            item.error = None
            db.commit()

            item_out_dir = os.path.join(out_dir, f"item_{item.id}")
            os.makedirs(item_out_dir, exist_ok=True)

            ydl_opts = {
                "format": "bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio/best[height<=480]",
                "outtmpl": os.path.join(item_out_dir, "%(title)s.%(ext)s"),
                "postprocessors": [],
                "quiet": True,
                "no_warnings": True,
                "socket_timeout": 30,
                "retries": 10,
                "extractor_retries": 3,
                "file_access_retries": 3,
                "no_check_certificate": True,
                "impersonate": ImpersonateTarget.from_str("chrome"),
            }
            if os.path.exists(user_cookies):
                ydl_opts["cookiefile"] = user_cookies

            def _try_download(no_cookies=False):
                opts = dict(ydl_opts)
                dl_dir = os.path.join(item_out_dir, "dl")
                os.makedirs(dl_dir, exist_ok=True)
                opts["outtmpl"] = os.path.join(dl_dir, "%(title)s.%(ext)s")
                if no_cookies:
                    opts.pop("cookiefile", None)
                    opts["format"] = "bestaudio[ext=m4a]/bestaudio"
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                files = os.listdir(dl_dir)
                if not files:
                    raise Exception("File tidak ditemukan")
                fname = files[0]
                src = os.path.join(dl_dir, fname)
                ext = os.path.splitext(fname)[1].lstrip(".")
                if ext not in ("m4a", "webm"):
                    os.remove(src)
                    raise Exception(f"Format tidak didukung: .{ext}")
                actual_title = os.path.splitext(fname)[0]
                safe_title = re.sub(r'[^\w\-_. ]', '', actual_title).strip()[:80] or "audio"
                new_name = f"{safe_title}.{ext}"
                dst = os.path.join(out_dir, new_name)
                if os.path.exists(dst):
                    os.remove(dst)
                os.rename(src, dst)
                shutil.rmtree(dl_dir, ignore_errors=True)
                item.title = actual_title
                return dst, new_name, ext

            def _try_download_android(no_cookies=False):
                opts = dict(ydl_opts)
                dl_dir = os.path.join(item_out_dir, "dl")
                os.makedirs(dl_dir, exist_ok=True)
                opts["outtmpl"] = os.path.join(dl_dir, "%(title)s.%(ext)s")
                if no_cookies:
                    opts.pop("cookiefile", None)
                opts["extractor_args"] = {"youtube": ["player_client=android"]}
                opts["format"] = "bestaudio[ext=m4a]/bestaudio"
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                files = os.listdir(dl_dir)
                if not files:
                    raise Exception("File tidak ditemukan")
                fname = files[0]
                src = os.path.join(dl_dir, fname)
                ext = os.path.splitext(fname)[1].lstrip(".")
                if ext not in ("m4a", "webm"):
                    os.remove(src)
                    raise Exception(f"Format tidak didukung: .{ext}")
                actual_title = os.path.splitext(fname)[0]
                safe_title = re.sub(r'[^\w\-_. ]', '', actual_title).strip()[:80] or "audio"
                new_name = f"{safe_title}.{ext}"
                dst = os.path.join(out_dir, new_name)
                if os.path.exists(dst):
                    os.remove(dst)
                os.rename(src, dst)
                shutil.rmtree(dl_dir, ignore_errors=True)
                item.title = actual_title
                return dst, new_name, ext

            def _try_android_chain(use_cookies):
                try:
                    return _try_download_android(no_cookies=not use_cookies)
                except Exception as e2:
                    if use_cookies:
                        return _try_download_android(no_cookies=True)
                    raise

            try:
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(180)  # 3 minutes timeout
                try:
                    dst, new_name, ext = _try_download()
                except Exception as e:
                    err_msg = str(e).lower()
                    has_cookies = os.path.exists(user_cookies)
                    if has_cookies and ("format is not available" in err_msg or "sign in" in err_msg):
                        try:
                            dst, new_name, ext = _try_download(no_cookies=True)
                        except Exception as e2:
                            e2_msg = str(e2).lower()
                            try:
                                dst, new_name, ext = _try_android_chain("sign in" in e2_msg)
                            except Exception as e3:
                                item.status = "failed"
                                item.error = str(e3)
                                shutil.rmtree(item_out_dir, ignore_errors=True)
                                db.commit()
                                continue
                    elif "sign in" in err_msg or "join this channel" in err_msg or "ssl" in err_msg or "eof" in err_msg or "connection" in err_msg or "timeout" in err_msg or "read timed out" in err_msg:
                        try:
                            dst, new_name, ext = _try_android_chain(has_cookies)
                        except Exception as e3:
                            item.status = "failed"
                            item.error = str(e3)
                            shutil.rmtree(item_out_dir, ignore_errors=True)
                            db.commit()
                            continue
                    else:
                        item.status = "failed"
                        item.error = str(e)
                        shutil.rmtree(item_out_dir, ignore_errors=True)
                        db.commit()
                        continue
            except TimeoutException:
                item.status = "failed"
                item.error = "Download timeout (3 menit)"
                shutil.rmtree(item_out_dir, ignore_errors=True)
                db.commit()
                logger.warning("Item %d timeout setelah 3 menit", item.id)
                continue
            finally:
                signal.alarm(0)

            shutil.rmtree(item_out_dir, ignore_errors=True)

            item.filename = new_name
            item.file_path = dst
            item.file_size = os.path.getsize(dst)
            item.status = "completed"
            item.completed_at = datetime.utcnow()
            completed_count += 1
            job.completed_items = completed_count
            db.commit()

        # Calculate total file size from completed items
        total_size = sum(item.file_size or 0 for item, _ in playlist_items if item.status == "completed" and item.file_size)
        job.file_size = total_size

        # If single video, propagate details to parent job
        if total_count == 1 and len(playlist_items) == 1:
            single_item = playlist_items[0][0]
            if single_item.status == "completed":
                job.filename = single_item.filename
                job.file_path = single_item.file_path
                job.completed_items = 1

        failed_count = sum(1 for item, _ in playlist_items if item.status == "failed")
        if job.status != "cancelled":
            if failed_count > 0 and completed_count > 0:
                job.status = "partial"
            elif failed_count > 0:
                job.status = "failed"
            else:
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
