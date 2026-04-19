# VitalRoute

A real-time medical supply chain platform built for the Google Solutions Challenge 2025.

The problem it solves is specific: a hospital in Lucknow runs out of O-negative blood at 2am. Somewhere across the city, three other hospitals have it. Nobody knows. The patient waits.

VitalRoute connects 50+ registered hospitals and suppliers on a live map, matches urgent supply requests to the nearest available source, and calculates the fastest route accounting for traffic. A nurse can describe the emergency in plain language instead of filling out a form — Gemini 2.5 Flash handles the rest.

---

## Stack

| | |
|---|---|
| Backend | Node.js 20, Express 4 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication + JWT |
| AI | Gemini 2.5 Flash |
| Maps | Google Maps Directions API + Distance Matrix API |
| Notifications | Firebase Cloud Messaging |
| Frontend | React 18, Vite, Tailwind CSS |
| Deployment | Vercel |

---

## Getting started

```bash
git clone https://github.com/ReemHamraz/VitalRoute.git
cd VitalRoute/vitalroute-backend

npm install
cp .env.example .env
# fill in your credentials

npm run dev
# GET /health → { "status": "ok" }
```

### Seed the database

```bash
node seed.js
```

Creates 50 hospitals across Lucknow with randomised inventory levels, 10 suppliers, and 3 demo requests. Without this the map is empty.

### Environment variables

Rename `.env.example` to `.env` and fill in:

```env
PORT=8080
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:5173

FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_WEB_API_KEY=

GOOGLE_MAPS_API_KEY=
GEMINI_API_KEY=
JWT_SECRET=
FCM_SERVER_KEY=
```

---

## Deployment

### Backend → ?

Push to GitHub. Connect the repo on [vercel.com](https://vercel.com), set root directory to `vitalroute-backend`, and add all environment variables in the Vercel dashboard under Settings → Environment Variables. Vercel detects Node.js automatically.

### Frontend → ?

```bash
cd vitalroute-frontend
npm run build
firebase deploy --only hosting
```

Set `VITE_API_URL` in your frontend `.env` to the Vercel deployment URL before building.

---

## How it works

```
Nurse types: "Highway accident — need 10 units O-negative and 2 ventilators NOW"
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │   Gemini 2.5 Flash   │
                            │   Intent Extraction  │
                            └─────────────────────┘
                                        │
                                        ▼
                        {
                          urgency: "CRITICAL",
                          items: [
                            { name: "O-negative blood", qty: 10 },
                            { name: "ventilator",       qty: 2  }
                          ],
                          flags: ["mass_casualty"]
                        }
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │   Matching Engine    │
                            │  scans 50 hospitals  │
                            │   + 15 suppliers     │
                            └─────────────────────┘
                                        │
                          ┌─────────────────────────┐
                          │  Google Distance Matrix  │
                          │   API  (single batch)    │
                          └─────────────────────────┘
                                        │
                                        ▼
                     ┌──────────────────────────────────────┐
                     │  Top 3 matches ranked by:            │
                     │  (0.6 × proximity) +                 │
                     │  (0.4 × stock availability ratio)    │
                     └──────────────────────────────────────┘
                                        │
                    ┌───────────────────┴────────────────────┐
                    ▼                                         ▼
          Match found within 50km                   No match found
          → notify hospital + supplier              → escalation alert
          → dispatch with live route                  to coordinator
```

## How the matching works

When a request comes in, the engine fetches all hospitals and suppliers, filters by available stock, and calls the Distance Matrix API in a single batch to get ETAs. Each source gets a score:

```
score = (0.6 × proximity) + (0.4 × stock availability ratio)
```

Top 3 results per item are returned. If nothing is found within 50km, an escalation alert fires to the coordinator.

---

## Known limitations

- Inventory status updates run on a 30-minute polling interval, not in real-time. A Firestore `onWrite` trigger would fix this but wasn't in scope.
- The Distance Matrix API caps at 25 origins per request. The first 25 eligible sources are used.
- The item name normalizer that maps Gemini output to Firestore keys covers common cases but not every phrasing variation.

---

## Built by

* Reem Hamraz
* Mohammad Maaz Siddiqui
* Haider Maseeh


Theme: Smart Supply Chains — Open Inovation: Resilient Logistics and Dynamic Supply Chain Optimization.

We picked healthcare because it's the highest-stakes version of the problem. Rerouting a package is a logistics problem. Rerouting a life is what actually matters.
