const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getEtaBatch } = require('../services/mapsService');

// 1. IMPORT AI SERVICE HERE
const { parseCrisisCommand } = require('../services/geminiService'); 

router.post('/', async (req, res) => {
  try {
    // 2. EXTRACT 'text' FROM THE FRONTEND REQUEST
    const { hospitalLocation, requiresColdChain, text } = req.body;
    const db = admin.firestore();

    // 3. LET GEMINI ANALYZE THE EMERGENCY
    let aiAnalysis = null;
    let needsColdChain = requiresColdChain; 

    if (text && text.trim() !== "") {
      console.log(`🧠 AI Analyzing Emergency: "${text}"`);
      
      try {
        // We try to use the AI
        aiAnalysis = await parseCrisisCommand(text, "hosp_lucknow_01");
        
        if (aiAnalysis && aiAnalysis.requiresColdChain === true) {
            needsColdChain = true;
        }
      } catch (aiError) {
        // 🛡️ THE SHIELD: If the key is expired, we catch the error here!
        console.warn(`⚠️ AI Service Unavailable (${aiError.message}). Falling back to manual mode.`);
        
        // We provide a fake AI response so the rest of the code doesn't explode
        const isCritical = text.toLowerCase().includes("accident") || text.toLowerCase().includes("asap");
        aiAnalysis = {
          heading: isCritical ? "Critical Emergency Response" : "Emergency Logistics Request",
          urgency: isCritical ? "CRITICAL" : "HIGH",
          requiresColdChain: requiresColdChain, // Trust the frontend switch
          items: [{ name: "Requested Emergency Supplies", quantity: 1 }]
        };
      }
    }

    // 4. Fetch all available suppliers
    const suppliersSnapshot = await db.collection('suppliers').where('status', '==', 'active').get();
    let availableSuppliers = [];
    
    suppliersSnapshot.forEach(doc => {
      availableSuppliers.push({ id: doc.id, ...doc.data() });
    });

    // 5. FEATURE 2: COLD CHAIN FILTERING ( powered by AI!)
    if (needsColdChain) {
      availableSuppliers = availableSuppliers.filter(s => s.hasRefrigeration === true);
    }

    if (availableSuppliers.length === 0) {
      return res.status(404).json({ success: false, message: "No suitable suppliers found." });
    }

    // 6. FEATURE 1: LIVE TRAFFIC ETA CALCULATION
    const rankedSuppliers = await getEtaBatch(
      hospitalLocation.lat, 
      hospitalLocation.lng, 
      availableSuppliers
    );

    
    // 7. THE STEP 3 SORTING LOGIC!
    // Sorting the array mathematically from fastest (lowest seconds) to slowest
    rankedSuppliers.sort((a, b) => a.duration - b.duration);

   // 8. Grab the absolute fastest supplier (index 0)
    const fastestSupplier = rankedSuppliers[0];

    // 9. FEATURE 3: FIRESTORE TRANSACTION (INVENTORY LOCK)
    const supplierRef = db.collection('suppliers').doc(fastestSupplier.id);

    try {
      // Start the atomic transaction
      await db.runTransaction(async (transaction) => {
        const supplierDoc = await transaction.get(supplierRef);

        if (!supplierDoc.exists) {
          throw new Error("Supplier no longer exists.");
        }

        const currentData = supplierDoc.data();

        // FAILSAFE: Check if someone else grabbed them milliseconds ago
        if (currentData.status !== 'active') {
          throw new Error("Race Condition caught: Supplier was just booked.");
        }

        

        
        transaction.update(supplierRef, {
          status: 'dispatched', // Changing status prevents others from matching with them
          lastDispatchedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // the transaction was 100% successful and locked.
      console.log(`🔒 Successfully locked asset: ${fastestSupplier.name}`);

      // 10. Return the absolute winner to the React frontend
      return res.json({
        success: true,
        match: fastestSupplier,
        etaText: `${Math.round(fastestSupplier.duration / 60)} mins in current traffic`,
        emergencyDetails: aiAnalysis 
      });

    } catch (transactionError) {
      console.error("Transaction aborted! Saved from double-booking:", transactionError);
      
      
      return res.status(409).json({ 
        success: false, 
        error: "Top supplier was booked by another emergency during calculation. Re-calculating required." 
      });
    }

  } catch (error) {
    console.error("[Match Route Error]:", error);
    res.status(500).json({ success: false, error: "Matching failed" });
  }
});

module.exports = router;
