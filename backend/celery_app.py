from celery import Celery

celery_app = Celery(
    "yt_downloader",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
)