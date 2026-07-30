from celery import Celery

celery_app = Celery(
    "yt_downloader",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)