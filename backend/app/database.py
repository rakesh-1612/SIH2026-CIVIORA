from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "civiora.db")
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
else:
    if os.getenv("VERCEL"):
        tmp_db = os.path.join("/tmp", "civiora.db")
        if not os.path.exists(tmp_db) and os.path.exists(DB_PATH):
            try:
                import shutil
                shutil.copy2(DB_PATH, tmp_db)
            except Exception:
                pass
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{tmp_db}"
    else:
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
