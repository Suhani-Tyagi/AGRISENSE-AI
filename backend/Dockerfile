FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run the database seeder on container startup to ensure demo is ready-to-use, then launch server
CMD ["sh", "-c", "python -m seed && uvicorn main:app --host 0.0.0.0 --port 8000"]
