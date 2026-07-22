# AgriSense AI - Full-Stack MVP

AgriSense AI is an AI-powered full-stack web application designed for smallholder farmers, agricultural buyers, and micro-finance officers. The app serves as a mobile-first, offline-tolerant, multilingual (English and Hindi) platform that helps farmers increase crop yield, access fair markets, and unlock micro-credit.

---

## 🌟 Key Features & Modules

1. **AI Crop Doctor (Disease Detection)**
   - Farmer uploads leaf photos to diagnose diseases.
   - Live integration with **Gemini 2.5 Flash API** (Structured JSON response).
   - Smart rule-based fallback diagnoses tomatoes, wheat, rice, cotton, and maize leaf diseases if no API key is set.
   - Provides organic and chemical treatments, estimated costs, and urgency indicators.

2. **Smart Soil & Irrigation Advisor**
   - Live visualizations of NPK nutrient levels, soil moisture, and pH levels over 30 or 90 days.
   - Periodic background simulator updates field readings.
   - Provides actionable agronomical advice: required irrigation volume and specific fertilizer treatments.
   - "Connect Real Sensor" stub replicates integration with real physical MQTT/IoT brokers.

3. **Climate Risk Alerts**
   - Connects live to the public **Open-Meteo API** to fetch forecasts using the field's GPS location.
   - Displays weather alerts (heatwave, frost, storm, flood).
   - Generates action-oriented advice (e.g., "Good day to spray pesticide" or "Avoid irrigation today — rain expected").
   - Graceful fallback to synthetic forecast if offline or API limits are hit.

4. **Fair-Price Marketplace**
   - Farmers list produce with Grade, Price, and Quantity.
   - Buyers search, filter, and place bidding offers.
   - **AI Pricing Assistant** provides Mandi price guides, historical charts, and price recommendations.
   - Integrated offer accept/reject flow that generates transaction logs.

5. **Alt-Data Credit Score (FarmScore)**
   - Computes a transparent credit score (0-100) based on:
     - Field data completeness (+10 pts per field, max 20)
     - Health tracking history (+5 pts per check, max 25)
     - Marketplace activity (+5 pts per listing, completed sales, max 25)
     - Simulated loan repayment records (Max 30, defaults incur -10 pt penalty)
   - Displays clear improvement tips and micro-credit offers.

6. **Unified Dashboard & Role-based Access**
   - Shared login gate (phone-based + mock SMS OTP verification).
   - Switch between **Farmer**, **Buyer**, and **Finance Officer** roles.
   - Micro-finance officers search farmers, view risk profiles, and approve micro-credits.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons, i18next (English & Hindi support), Axios.
- **Backend**: Python, FastAPI, SQLAlchemy ORM, Uvicorn, PyJWT (pure Python, zero binary compilation errors).
- **Database**: SQLite (default local, 90-day time-series history pre-seeded) / PostgreSQL (production docker-compose).
- **Containerization**: Docker & Docker Compose.

---

## 📊 Architecture Diagram

```
                 +-------------------------------------------------+
                 |             Mobile Web Browser                  |
                 |      (React + Tailwind + i18next + Recharts)    |
                 +-----------------------+-------------------------+
                                         |
                                         | REST HTTP Calls
                                         v
                 +-------------------------------------------------+
                 |              FastAPI Web Server                 |
                 +----+------------------+--------------------+----+
                      |                  |                    |
                      v                  v                    v
           +--------------------+  +------------+  +--------------------+
           | Gemini Vision API  |  | Open-Meteo |  | SQLite/PostgreSQL  |
           |   (Crop Doctor)    |  | (Weather)  |  |  (Database Store)  |
           +--------------------+  +------------+  +---------+----------+
                                                             ^
                                                             | Telemetry
                                                   +---------+----------+
                                                   | IoT Daemon Thread  |
                                                   | (Sensor Simulator) |
                                                   +--------------------+
```

---

## ⚖️ Real vs. Simulated Summary

| Module / Component | What is Real? | What is Simulated? |
| :--- | :--- | :--- |
| **User & Session Auth** | Full JWT sessions, password hashing, and user registration. | SMS Gateway (Mocked via a static `123456` OTP screen). |
| **Crop Doctor** | Full image uploads, diagnosis history, and Gemini 2.5 Flash API calls. | Fallback diagnosis classifier if no Gemini key is provided. |
| **Climate Alerts** | Live REST requests to Open-Meteo using GPS coordinates. | Fallback 7-day forecast if offline. |
| **Smart Sensors** | SQLAlchemy schema and Recharts visualizations. | Background simulator daemon generating NPK/pH readings. |
| **Marketplace** | Listings creation, search filters, bidding, and trade history. | Mandi index data feed (calculated statistically). |
| **Credit Scoring** | The FarmScore formula, breakdown metrics, and loan offers. | Simulated transaction payment status (repaid vs defaulted). |

---

## 🚀 Setup & Execution Instructions

Ensure you have **Node.js (v18+)** and **Python (v3.10+)** installed on your system.

### Option A: Local Bare-Metal (Recommended for Quick Demo)

#### 1. Backend Server Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Initialize a Python virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   - **Windows**: `.venv\Scripts\activate`
   - **macOS/Linux**: `source .venv/bin/activate`
4. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the database seeding script to populate 15 farmers, 90 days of sensor history, and active market listings:
   ```bash
   python -m seed
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The API will be available at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.*

#### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

### Option B: Docker Compose

Docker compose bundles the application services together. 

1. Create a `.env` file in the root directory using the template:
   ```bash
   cp .env.example .env
   ```
2. Spin up the containers:
   ```bash
   docker-compose up --build
   ```
3. Open your browser and navigate to:
   - **Frontend**: `http://localhost:3000`
   - **Backend API**: `http://localhost:8000`

---

## 🔮 Future Roadmap

1. **Physical IoT Sensor Feed**: Swap the background simulator thread with a subscription to an MQTT broker connected to physical LoRaWAN soil moisture soil probes.
2. **Satellite NDVI & GIS Overlay**: Integrate Sentinel-2 satellite imagery API overlays on the farmer field dashboard to visualize historical crop greenness index (NDVI) mapping.
3. **SMS & USSD Interface**: Replicate dashboard services on a Twilio/SMS gateway interface so feature-phone users can text `CROP` or `SOIL` to receive offline recommendations.
4. **Micro-Finance Partners**: Integrate official open banking APIs with rural banks (like NABARD) to underwrite real credit lines using the FarmScore.
