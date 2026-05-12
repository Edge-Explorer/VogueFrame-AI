from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings
from app.models.base import Base

db_url = settings.DATABASE_URL
# If the URL is missing, invalid, or left as the template placeholder, fall back seamlessly to local SQLite
if not db_url or "ep-xxx.neon.tech" in db_url or not db_url.startswith(("postgresql", "sqlite")):
    db_url = "sqlite:///./vogueframe.db"

print(f"\n[DATABASE] Booting session engine targeted at: {db_url.split('@')[-1] if '@' in db_url else db_url}\n")

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables on application startup."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
