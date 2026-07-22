import datetime
import os
import secrets
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from passlib.context import CryptContext

from .database import get_db
from .models import User

# Load SECRET_KEY from environment, with a secure fallback for local dev
SECRET_KEY = os.getenv("SECRET_KEY", "agrisense_super_secret_key_for_demo_purposes")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Initialize Passlib CryptContext using bcrypt scheme
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using secure bcrypt."""
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    Supports both modern bcrypt and legacy custom SHA-256 + salt formats
    to prevent breaking login flow for pre-seeded database users.
    """
    # Check for legacy SHA-256 format (contains a '$' and doesn't start with $2b$)
    if "$" in hashed_password and not hashed_password.startswith("$2b$"):
        try:
            salt, hashed = hashed_password.split("$")
            import hashlib
            check = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
            return check == hashed
        except Exception:
            return False
            
    # Standard bcrypt verification
    try:
        return pwd_context.verify(password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.phone == phone).first()
    if user is None:
        raise credentials_exception
    return user
