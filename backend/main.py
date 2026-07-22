import os
import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base, SessionLocal
from .simulator import simulate_step
from .routes import auth, fields, diagnoses, weather, marketplace, credit, webhook, forum

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AgriSense AI API",
    description="Full-stack REST API backend for smallholder farming MVP",
    version="1.0.0"
)

# Enable CORS with restricted origin matching actual deployed and local dev servers
allowed_origins = [
    "https://agrisense-ai-nu.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start background thread for IoT simulator
def run_iot_simulation_loop():
    print("Background IoT Sensor Simulator Thread Started...")
    while True:
        try:
            db = SessionLocal()
            simulate_step(db)
            db.close()
        except Exception as e:
            print(f"IoT Simulator loop encountered an error: {e}")
        # Simulate new sensor feeds every 2 minutes for demo visibility
        time.sleep(120)

@app.on_event("startup")
def startup_event():
    # Launch simulation loop in a daemon thread
    thread = threading.Thread(target=run_iot_simulation_loop, daemon=True)
    thread.start()

# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(fields.router, prefix="/api")
app.include_router(diagnoses.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(marketplace.router, prefix="/api")
app.include_router(credit.router, prefix="/api")
app.include_router(webhook.router, prefix="/api")
app.include_router(forum.router, prefix="/api")

# Add a simple health check route
@app.get("/")
def read_root():
    return {"name": "AgriSense AI API", "status": "online", "mode": "Demo Mode"}
