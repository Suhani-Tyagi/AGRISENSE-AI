import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agrisense.db")

# If running on Vercel, copy seeded db to /tmp/ to allow ephemerally writing to it
if os.getenv("VERCEL") == "1":
    src_db = "./agrisense.db"
    dest_db = "/tmp/agrisense.db"
    if os.path.exists(src_db) and not os.path.exists(dest_db):
        import shutil
        shutil.copy(src_db, dest_db)
    DATABASE_URL = f"sqlite:///{dest_db}"

# For SQLite, we need to allow access from multiple threads
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
