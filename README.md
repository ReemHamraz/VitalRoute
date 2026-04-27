# 🚨 VitalRoute- Google Solutions Challenge 2026
### *Routing the difference between life and death.*
 
> **In a crisis, every second of manual logistics is a second stolen from survival.**

[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Backend on Cloud Run](https://img.shields.io/badge/Backend-Google%20Cloud%20Run-4285F4?logo=googlecloud)](https://cloud.google.com/run)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue?logo=google)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Database-Firestore-orange?logo=firebase)](https://firebase.google.com)

---

##  UN Sustainable Development Goals

VitalRoute directly targets:
- **Goal 3** — Good Health & Well-being
- **Goal 9** — Industry, Innovation, and Infrastructure

---

##  The Problem

When a mass casualty event occurs, hospitals scramble to locate and request medical supplies through fragmented phone calls, jammed radio lines, and outdated spreadsheets. The result:

- Multiple hospitals call the same blood bank simultaneously
- Un-refrigerated trucks are dispatched to pick up temperature-sensitive organs
- Manual routing wastes golden minutes in the critical window between life and death

**VitalRoute eliminates this chaos.**

---

##  The Solution

VitalRoute is a **voice-to-dispatch command center** that translates unstructured human speech into structured, conflict-free logistics operations — in milliseconds.

A dispatcher speaks the emergency. VitalRoute handles everything else:
- AI parses the urgency and extracts exact medical needs
- Cold-chain requirements are detected and enforced automatically
- The fastest available, equipped supplier is identified using live traffic data
- The route is locked atomically to prevent double-booking

---

##  Architecture

### End-to-End Flow

```
[React UI]
    │
    ▼ Natural Language Text / Voice
[Cloud Run — Express.js Backend]
    │
    ├──▶ [Gemini 2.5 Flash API]
    │         └── Returns: { urgency, items, requiresColdChain }
    │
    ├──▶ [Firestore Database]
    │         └── Filtered by cold-chain, availability, verification status
    │
    ├──▶ [Google Maps Distance Matrix API]
    │         └── Live ETAs across all eligible suppliers
    │
    └──▶ [Firestore Transaction — Atomic Lock]
              └── Supplier status: "active" → "dispatched"
    │
    ▼
[React UI — Live Route Drawn on Map]
```

---

##  Core Features

###  A. AI-Powered NLP Triage
Dispatchers speak or type raw, unstructured emergencies instead of navigating dropdown menus. The backend routes the text to **Gemini 2.5 Flash** using few-shot prompting, which returns a strictly typed JSON payload:

```json
{
  "urgency": "CRITICAL",
  "items": [{ "name": "O-negative blood", "qty": 10 }],
  "requiresColdChain": true
}
```

###  B. Autonomous Cold-Chain Intelligence
If the AI extracts a temperature-sensitive item (plasma, organs, vaccines), it automatically flips `requiresColdChain: true`. The backend instantly filters out any supplier without a refrigerated fleet — preventing medical assets from spoiling in transit.

###  C. Zero-Input Geolocation Binding
The authenticated user's session token binds their pre-verified hospital coordinates to every request. No manual address entry. No location spoofing. Zero input, zero error.

###  D. Hybrid Geospatial Routing Engine
The backend batches all eligible supplier coordinates and sends them to the **Google Maps Distance Matrix API** with `departure_time=now`. It selects the minimum real-time ETA and returns the winning route to the frontend.

###  E. Atomic Concurrency Control
Before finalizing any dispatch, the backend executes a **Firestore Transaction**. If the supplier is still `"active"`, it is atomically locked to `"dispatched"`. If another hospital claimed the same supplier a millisecond earlier, the transaction fails gracefully and instantly reroutes to the next fastest option — mathematically preventing double-booking.

###  F. The 503 Failsafe Shield
If Gemini experiences a global outage, the backend's `catch` block intercepts the crash and falls back to a local **Regex/Keyword matching engine**. Emergency dispatch never goes offline.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js (Vite), Tailwind CSS, @react-google-maps/api |
| **Backend** | Node.js, Express.js |
| **Database** | Firebase Admin SDK (Firestore) |
| **AI** | Gemini 2.5 Flash API |
| **Mapping** | Google Maps Distance Matrix API, Directions API |
| **Security** | express-rate-limit, Custom API Header Keys, CORS |
| **Frontend Deploy** | Vercel |
| **Backend Deploy** | Google Cloud Run |

---

##  Getting Started

### Prerequisites

- Node.js v18+
- Google Cloud SDK installed
- Firebase project created
- API keys for: Google Maps, Gemini AI, Firebase

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/vitalroute.git
cd vitalroute
```

### 2. Backend Setup

```bash
cd vitalroute-backend
npm install
```

Create a `.env` file:

```env
PORT=8080
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:5173
API_KEY=your_secret_key

FIREBASE_WEB_API_KEY=your_firebase_web_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

```bash
node index.js
```

### 3. Frontend Setup

```bash
cd vitalroute-frontend
npm install
```

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_API_KEY=your_secret_key

VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

```bash
npm run dev
```

---

## Deployment

### Backend — Google Cloud Run

```bash
gcloud run deploy vitalroute \
  --source . \
  --region asia-south2 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "API_KEY=...,GEMINI_API_KEY=...,GOOGLE_MAPS_API_KEY=...,FIREBASE_WEB_API_KEY=..."
```

### Frontend — Vercel

Set the following in **Vercel → Project → Settings → Environment Variables**:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | Your Cloud Run service URL |
| `VITE_API_KEY` | Same value as backend `API_KEY` |
| `VITE_GOOGLE_MAPS_API_KEY` | Your Maps API key |
| `VITE_FIREBASE_*` | Your Firebase config values |

Then push to your connected Git branch — Vercel deploys automatically.

---

##  UI Highlights

- **Dual-Mode Map** — Toggle between a custom SVG tactical radar (rotating conic-gradient animations) and a live Google Satellite hybrid map
- **Live Logistics Feed** — Real-time incident queue with urgency color coding (CRITICAL → RED, HIGH → ORANGE, etc.)
- **Crisis Command Input** — Natural language text box with mic support, cold-chain toggle, and one-click Extract + Dispatch
- **Fully Responsive** — Fluid mobile layout stacks Map → Feed → Command Input vertically for field operatives

---

##  Technical Challenges Overcome

**1. Map Jitter on Keypress**
Typing in the React input caused the Google Map to re-render and flash. Fixed with `useMemo` hooks caching `mapContainerStyle`, `mapCenter`, and `mapOptions` to break the re-render chain.

**2. Mobile Viewport Collapse**
Google Maps requires strict pixel heights, causing it to disappear in Flexbox mobile layouts. Solved with a hybrid CSS Grid approach using a `window` resize listener (`isMobile`) that assigns rigid `50vh` blocks.

**3. CORS on Deployment**
Deploying Vite to Vercel and Express to Cloud Run caused CORS to block all requests. Fixed by explicitly listing allowed headers (`Content-Type`, `x-api-key`) and bypassing the API key middleware for `OPTIONS` preflight requests.

**4. Atomic Double-Booking**
Multiple hospitals requesting the same supplier simultaneously caused race conditions. Solved with Firestore Transactions that execute a read-modify-write in a single indivisible operation.

---

##  Future Roadmap

- **Drone Delivery Integration** — Same AI/Geo architecture extended to route automated medical drones
- **FEMA / Disaster Relief API** — Plug into national emergency management feeds
- **Organ Transplant Networks** — Ultra-strict cold-chain and time-window enforcement for organ logistics
- **Predictive Stockpiling** — ML model to forecast supply shortages before crises occur

---

##  Team

Built for the **Google Solution Challenge 2026** by Reem Hamraz, Mohammad Maaz Siddiqui and Haider Maseeh.

---

##  License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>VitalRoute: Routing the difference between life and death.</strong>
</div>
