const axios = require('axios');
const { db } = require('../config/firebase');

const parseCrisisCommand = async (rawText, hospitalId) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const systemPrompt = "You are a medical emergency logistics assistant for VitalRoute.\nYour ONLY job is to extract structured supply requests from natural language.\nReturn ONLY valid JSON, no markdown, no explanation.\nSchema: { urgency: NORMAL|URGENT|CRITICAL, items: [{ category: blood|oxygen|medicine|equipment|organ, name: string, quantity: number, unit: string }], context_note: string, flags: [mass_casualty|pediatric|surgical|organ_transplant|none] }\nRules: infer urgency from context if not stated. If quantity unstated set null. Never hallucinate items. If not a supply request return { error: not_a_supply_request }";

    const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [ { parts: [{ text: rawText }] } ],
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        const response = await axios.post(url, payload);
        let text = response.data.candidates[0].content.parts[0].text;
        
        let cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        await db.collection('crisis_requests').add({
            hospitalId,
            rawText,
            parsed,
            timestamp: new Date(),
            status: "pending_confirmation"
        });

        return parsed;
    } catch (error) {
        console.error("Gemini API Error", error);
        throw new Error("Failed to parse command");
    }
};

module.exports = { parseCrisisCommand };
