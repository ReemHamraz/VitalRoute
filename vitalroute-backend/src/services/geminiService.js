const { db } = require('../config/firebase');

// No axios needed — Gemini REST works with native fetch (Node 18+)
const parseCrisisCommand = async (rawText, hospitalId) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

 
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
 const systemPrompt = `You are an expert medical emergency logistics AI for VitalRoute.
Your ONLY job is to extract structured supply requests from natural language.
Return ONLY valid JSON, no markdown, no explanation.

Schema: {
  "heading": string,
  "urgency": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "requiresColdChain": boolean,
  "items": [{ "category": "blood|oxygen|medicine|equipment|organ|ppe", "name": string, "quantity": number, "unit": string }],
  "context_note": string,
  "flags": ["mass_casualty" | "pediatric" | "surgical" | "organ_transplant" | "trauma" | "none"]
}

RULES:
- HEADING: Create a specific 2-4 word medical title (e.g., "Mass Casualty Response"). Do NOT use generic terms like "Emergency Service".
- COLD CHAIN: Set "requiresColdChain" to true ONLY IF requested items include blood, organs, or temperature-sensitive medications.

EXAMPLES OF EXACT CLASSIFICATION (MIMIC THIS BEHAVIOR):

Input: "Major highway accident, multiple casualties. Need 5 units O-negative blood and 2 portable ventilators ASAP."
Output: {
  "heading": "Mass Casualty Accident",
  "urgency": "CRITICAL",
  "requiresColdChain": true,
  "items": [
    { "category": "blood", "name": "O-negative blood", "quantity": 5, "unit": "units" },
    { "category": "equipment", "name": "Portable Ventilators", "quantity": 2, "unit": "units" }
  ],
  "context_note": "Highway accident, multiple casualties, needed ASAP",
  "flags": ["mass_casualty", "trauma"]
}

Input: "We are running low on oxygen tanks in the ICU, need 10 more dispatched today."
Output: {
  "heading": "Urgent Oxygen Resupply",
  "urgency": "HIGH",
  "requiresColdChain": false,
  "items": [
    { "category": "oxygen", "name": "Oxygen tanks", "quantity": 10, "unit": "tanks" }
  ],
  "context_note": "Running low in ICU, needed today",
  "flags": ["none"]
}

Input: "Scheduled heart bypass surgery next Thursday, need 4 units of AB positive."
Output: {
  "heading": "Scheduled Surgery Prep",
  "urgency": "MODERATE",
  "requiresColdChain": true,
  "items": [
    { "category": "blood", "name": "AB positive blood", "quantity": 4, "unit": "units" }
  ],
  "context_note": "Needed for next Thursday",
  "flags": ["surgical"]
}

Input: "Routine monthly restock. Send 50 boxes of N95 masks and 20 boxes of sterile surgical gloves."
Output: {
  "heading": "Routine PPE Restock",
  "urgency": "LOW",
  "requiresColdChain": false,
  "items": [
    { "category": "ppe", "name": "N95 masks", "quantity": 50, "unit": "boxes" },
    { "category": "ppe", "name": "Sterile surgical gloves", "quantity": 20, "unit": "boxes" }
  ],
  "context_note": "Routine monthly administrative restock",
  "flags": ["none"]
}
  
Rules:
- URGENCY MAPPING IS STRICT:
  - If the text mentions "cardiac arrest", "asap", "immediate", "stat", "hemorrhage", or "trauma", it MUST be "CRITICAL".
  - If it mentions "low stock", "urgent", or "need today", it is "HIGH".
  - If it mentions "scheduled", "tomorrow", or "next week", it is "NORMAL".
- HEADING: Create a specific 2-4 word medical title (e.g., "Cardiac Arrest Response", "Trauma Blood Request"). Do NOT use "Emergency Service" or "Emergency Logistics Request".
- COLD CHAIN: Set "requiresColdChain" to true ONLY IF requested items include blood, organs, or temperature-sensitive medications.
- If quantity is not stated, set quantity to 1.
- Never hallucinate items not mentioned.
- If the message is not a supply request, return { "error": "not_a_supply_request" }`;

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: rawText }] }],
    generationConfig: {
      responseMimeType: 'application/json', // forces JSON output — no fence stripping needed
      temperature: 0.1,                     // low temp = more deterministic JSON
    },
  };

  let parsed;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned empty response');

    // Strip fences as a safety net even though responseMimeType should prevent them
    const clean = text.replace(/```json|```/gi, '').trim();
    parsed = JSON.parse(clean);

  } catch (error) {
    // Log full error so Cloud Run logs show the real cause
    console.error('[Gemini] Parse failed:', error.message);
    throw new Error(`Gemini parsing failed: ${error.message}`);
  }

  // Always audit-log to Firestore, even if it's an error response
  await db.collection('crisis_requests').add({
    hospitalId: hospitalId || null,
    rawText,
    parsed,
    timestamp: new Date(),
    status: parsed?.error ? 'rejected' : 'pending_confirmation',
  });

  // If Gemini says it's not a supply request, surface that to the caller
  if (parsed?.error === 'not_a_supply_request') {
    const err = new Error('Input was not recognised as a supply request');
    err.status = 400;
    throw err;
  }

  return parsed;
};

module.exports = { parseCrisisCommand };