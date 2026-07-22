import datetime
import hashlib
import secrets
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from .database import get_db
from .models import User

SECRET_KEY = os_key = secrets.token_hex(32) # Random key per server run or static key
# Let's use a static key for persistent sessions across server restarts
SECRET_KEY = "agrisense_super_secret_key_for_demo_purposes"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Custom SHA-256 Hashing with Salt to bypass passlib deprecations in Python 3.14
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
    return f"{salt}${hashed}"

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        salt, hashed = hashed_password.split("$")
        check = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
        return check == hashed
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
