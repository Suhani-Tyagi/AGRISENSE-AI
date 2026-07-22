import time
from fastapi import HTTPException, Request, status
from typing import Dict, List

# In-memory rate limiting store mapping IP address to request timestamps
RATE_LIMIT_STORE: Dict[str, List[float]] = {}
LIMIT_WINDOW = 60      # 1 minute window
MAX_REQUESTS_PER_WINDOW = 5

def check_rate_limit(request: Request):
    """
    FastAPI dependency that enforces IP-based rate limiting on sensitive endpoints.
    Allows a maximum of 5 requests per 60 seconds.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Initialize or fetch client IP list
    if client_ip not in RATE_LIMIT_STORE:
        RATE_LIMIT_STORE[client_ip] = []
        
    # Filter out timestamps older than the limit window
    RATE_LIMIT_STORE[client_ip] = [t for t in RATE_LIMIT_STORE[client_ip] if now - t < LIMIT_WINDOW]
    
    # Check if requests limit has been exceeded
    if len(RATE_LIMIT_STORE[client_ip]) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again in 1 minute."
        )
        
    # Record the current request timestamp
    RATE_LIMIT_STORE[client_ip].append(now)
