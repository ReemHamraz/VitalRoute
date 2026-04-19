const { db } = require('../config/firebase');

// No axios needed — Gemini REST works with native fetch (Node 18+)
const parseCrisisCommand = async (rawText, hospitalId) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

 
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const systemPrompt = `You are a medical emergency logistics assistant for VitalRoute.
Your ONLY job is to extract structured supply requests from natural language.
Return ONLY valid JSON, no markdown, no explanation.
Schema: {
  "urgency": "NORMAL" | "URGENT" | "CRITICAL",
  "items": [{ "category": "blood|oxygen|medicine|equipment|organ", "name": string, "quantity": number, "unit": string }],
  "context_note": string,
  "flags": ["mass_casualty" | "pediatric" | "surgical" | "organ_transplant" | "none"]
}
Rules:
- Infer urgency from context if not stated (accident = CRITICAL, running low = URGENT, routine = NORMAL)
- If quantity is not stated, set quantity to 1
- Never hallucinate items not mentioned
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