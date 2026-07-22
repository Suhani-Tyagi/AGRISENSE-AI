import os
import sys

# Add project root directory to sys.path so backend is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

# This is required by Vercel serverless functions
__all__ = ["app"]
