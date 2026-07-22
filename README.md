# AgriSense AI - Full-Stack MVP

AgriSense AI is an AI-powered full-stack web application designed for smallholder farmers, agricultural buyers, and micro-finance officers. The app serves as a mobile-first, offline-tolerant, multilingual (English and Hindi) platform that helps farmers increase crop yield, access fair markets, and unlock micro-credit.

---

## 🌟 Key Features & Modules

1. **AI Crop Doctor (Disease Detection & Explainability)**
   - Farmer uploads leaf photos to diagnose diseases.
   - Live integration with **Gemini 2.5 Flash API** (Structured JSON response).
   - Smart rule-based fallback diagnoses tomatoes, wheat, rice, cotton, and maize leaf diseases if no API key is set.
   - Provides organic and chemical treatments, estimated treatment costs, urgency indicators, and plain-language *"What This Means"* explanations.

2. **Smart Soil & Irrigation Advisor**
   - Live visualizations of NPK nutrient levels, soil moisture, and pH levels over 30 or 90 days.
   - Periodic background simulator updates field readings.
   - Actionable agronomical advice: required irrigation volume and specific fertilizer treatments.
   - "Connect Real Sensor" stub replicates integration with real physical MQTT/IoT brokers.

3. **Satellite/NDVI Vegetation Health Overlay**
   - Interactive 5x5 satellite canopy map view detailing NDVI health indices (0.0 to 1.0) with color-coded canopy status legends.
   - View switcher between live soil sensor telemetry, satellite canopy grid maps, and yield forecasts.

4. **Crop Yield Prediction**
   - AI yield forecasting calculating expected harvest tonnage based on soil moisture logs, NPK levels, and diagnosis history.
   - Displays estimated market valuations (INR) and confidence ratings.

5. **Climate Risk Alerts**
   - Connects live to the public **Open-Meteo API** to fetch forecasts using the field's GPS location.
   - Weather alerts (heatwave, frost, storm, flood) and action-oriented guidance.

6. **Fair-Price Marketplace & Price Trend Alerts**
   - Farmers list produce with Grade, Price, and Quantity.
   - Buyers search, filter, and place bidding offers.
   - **AI Pricing Assistant** provides Mandi price guides, historical charts, and plain-language recommendations.
   - **Price Trend Alerts**: Farmers set price watcher thresholds (e.g. "Notify me if Tomato goes above ₹25") triggering in-app alert notifications.

7. **Community Q&A Forum**
   - Discussion forum feed where farmers post questions and receive answers from peers and extension officers.
   - Filterable by crop type (Tomato, Wheat, Rice, Cotton, Maize) and region.

8. **Alt-Data Credit Score (FarmScore) & Gamification**
   - Transparent credit score (0-100) based on field completeness, diagnosis history, marketplace trade, and repayment logs.
   - Plain-language *"What This Means"* credit eligibility explanation.
   - **Gamification**: Active telemetry check-in streaks (🔥) and badge achievements (🌱 Bhoomi Putra, 🩺 Dr. Sprout, 🏆 Trade Guru, ⭐ Credit Champion).

9. **Finance Officer Portfolio Analytics & PDF Export**
   - **Portfolio Analytics**: Aggregated regional FarmScores, common seasonal disease cases, and marketplace transaction volume bar charts.
   - **PDF Credit Report**: One-click browser print memo formatting A4 credit dossiers for offline underwriting review.

10. **SMS & WhatsApp Fallback Channel**
    - Twilio-compatible webhook endpoint (`POST /api/webhook/whatsapp`) processing incoming text/media queries from feature phones.
    - Integrated WhatsApp Simulation Sandbox panel for live interactive demo testing.

11. **PWA & Mobile-First Design**
    - Installable Web Manifest (`manifest.json`) and Service Worker (`sw.js`) for offline caching of weather and field data.
    - Optimized for low-end Android mobile devices (360px–430px screen width).
    - Persistent **Demo Mode Transparency Banner** detailing live vs. simulated data components.

---

## ⚖️ Real vs. Simulated Summary

| Module / Component | What is Real? | What is Simulated? |
| :--- | :--- | :--- |
| **User & Session Auth** | Full JWT sessions, `passlib[bcrypt]` password hashing, and rate-limited auth protection. | SMS Gateway (Mocked via a static `123456` OTP screen). |
| **Crop Doctor** | Full image uploads, diagnosis history, plain-language explanations, and Gemini 2.5 Flash API calls. | Fallback diagnosis classifier if no Gemini key is provided. |
| **WhatsApp Webhook** | Twilio form-urlencoded parser, AI vision pipeline handoff, and plain-text SMS response formatter. | Live Twilio SMS delivery (Interactive in-app sandbox provided). |
| **Climate Alerts** | Live REST requests to Open-Meteo using GPS coordinates. | Fallback 7-day forecast if offline. |
| **Smart Sensors & NDVI** | SQLAlchemy schema, Recharts visualizations, and 5x5 grid renderer. | Background simulator daemon generating NPK/pH & Sentinel-2 grid index. |
| **Marketplace & Alerts** | Listings creation, search filters, bidding, trade logs, and price alert matcher. | Mandi index data feed (calculated statistically). |
| **Credit Scoring & Badges** | The FarmScore formula, breakdown metrics, loan offers, streak calculations, and badge achievements. | Simulated transaction payment status (repaid vs defaulted). |
| **PWA & Offline** | Web Manifest (`manifest.json`) and Service Worker (`sw.js`) offline asset caching. | N/A |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons, i18next (English & Hindi), Axios, Web Speech API.
- **Backend**: Python, FastAPI, SQLAlchemy ORM, Uvicorn, PyJWT, Passlib (bcrypt), Rate Limiter.
- **Database**: SQLite (default local, 90-day time-series history pre-seeded) / PostgreSQL.
- **Containerization & Deployment**: Docker, Docker Compose, Vercel ready (`vercel.json`).

---

## 🔑 Environment Variables

The backend application supports the following environment variables (defined in `.env`):

| Variable | Description | Default | Required? |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | Secret key used for signing JWT authentication tokens. | `agrisense_super_secret_jwt_key_2026` | Recommended in production |
| `GEMINI_API_KEY` | Google Gemini API key for live AI leaf diagnosis. | Empty (uses fallback classifier) | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID for WhatsApp webhook validation. | Empty (uses mock sandbox) | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token for signature validation. | Empty | Optional |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp Business sender phone number. | `whatsapp:+14155238886` | Optional |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins. | `https://agrisense-ai-nu.vercel.app,http://localhost:5173` | Recommended in production |

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
5. Run the database seeding script to populate 15 farmers, 90 days of sensor history, Q&A discussions, and market listings:
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
