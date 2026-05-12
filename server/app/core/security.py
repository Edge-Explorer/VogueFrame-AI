from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    # Safely truncate to 72 BYTES (not just characters) to account for multi-byte Unicode strings
    safe_bytes = plain.encode("utf-8")[:72]
    # Decode back, ignoring invalid partial UTF-8 sequences at the trailing byte slice boundary
    safe_str = safe_bytes.decode("utf-8", errors="ignore")
    return pwd_context.hash(safe_str)


def verify_password(plain: str, hashed: str) -> bool:
    safe_bytes = plain.encode("utf-8")[:72]
    safe_str = safe_bytes.decode("utf-8", errors="ignore")
    return pwd_context.verify(safe_str, hashed)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(
        {"sub": subject, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": subject, "exp": expire, "type": "refresh"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
