import os
from datetime import datetime
from dotenv import load_dotenv

# Load .env from backend/ for local, or use environment variables for Docker
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, scoped_session
from contextlib import contextmanager

Base = declarative_base()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////app/data/downloads.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    playlist_url = Column(String, nullable=False)
    playlist_name = Column(String, nullable=True)
    status = Column(String, default="queued")
    filename = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_size = Column(Float, default=0)
    error = Column(String, nullable=True)
    total_items = Column(Integer, default=0)
    completed_items = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    format = Column(String, default="m4a")
    progress = Column(String, nullable=True)

class PlaylistItem(Base):
    __tablename__ = "playlist_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=True)
    status = Column(String, default="queued") # queued, downloading, completed, failed
    filename = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_size = Column(Float, default=0)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False, default="")
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(engine)

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()