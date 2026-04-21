const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getEtaBatch } = require('../services/mapService');

router.post('/', async (req, res) => {
  try {
    const { hospitalLocation, requiresColdChain } = req.body;
    const db = admin.firestore();

    // 1. Fetch all available suppliers from your database
    const suppliersSnapshot = await db.collection('suppliers').where('status', '==', 'active').get();
    let availableSuppliers = [];
    
    suppliersSnapshot.forEach(doc => {
      availableSuppliers.push({ id: doc.id, ...doc.data() });
    });

    // 2. FEATURE 2: COLD CHAIN FILTERING
    if (requiresColdChain) {
      availableSuppliers = availableSuppliers.filter(s => s.hasRefrigeration === true);
    }

    if (availableSuppliers.length === 0) {
      return res.status(404).json({ success: false, message: "No suitable suppliers found." });
    }

    // 3. FEATURE 1: LIVE TRAFFIC ETA CALCULATION
    // Send the hospital coords and the array of supplier coords to Google Maps
    const rankedSuppliers = await getEtaBatch(
      hospitalLocation.lat, 
      hospitalLocation.lng, 
      availableSuppliers
    );

    // 4. THE STEP 3 SORTING LOGIC!
    // Sort the array mathematically from fastest (lowest seconds) to slowest
    rankedSuppliers.sort((a, b) => a.duration - b.duration);

   // 5. Grab the absolute fastest supplier (index 0)
    const fastestSupplier = rankedSuppliers[0];

    // 6. FEATURE 3: FIRESTORE TRANSACTION (INVENTORY LOCK)
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

        // TODO: If you are tracking specific item quantities, you would subtract them here
        // e.g., if (currentData.oxygenTanks < requestedTanks) throw Error("Not enough stock")

        // UPDATE: Lock the supplier (or subtract the inventory)
        transaction.update(supplierRef, {
          status: 'dispatched', // Changing status prevents others from matching with them
          lastDispatchedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // If we reach this line, the transaction was 100% successful and locked.
      console.log(`🔒 Successfully locked asset: ${fastestSupplier.name}`);

      // 7. Return the absolute winner to the React frontend
      return res.json({
        success: true,
        match: fastestSupplier,
        etaText: `${Math.round(fastestSupplier.duration / 60)} mins in current traffic`
      });

    } catch (transactionError) {
      console.error("Transaction aborted! Saved from double-booking:", transactionError);
      
      // Tell the frontend that the supplier was grabbed, and they need to re-run matching
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