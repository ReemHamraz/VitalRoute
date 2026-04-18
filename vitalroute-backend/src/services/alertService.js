const { db } = require('../config/firebase');

const checkThresholds = async () => {
  try {
    const hospitalsSnapshot = await db.collection('hospitals').get();
    
    // Use an array of promises for concurrent execution if needed, but for simplicity we iterate async.
    for (const doc of hospitalsSnapshot.docs) {
      const hospital = doc.data();
      const inventory = hospital.inventory || {};
      let isCritical = false;
      let isWarning = false;
      let lowStockItems = [];

      for (const [item, data] of Object.entries(inventory)) {
        if (data.quantity === 0) {
          isCritical = true;
          lowStockItems.push(item);
        } else if (data.quantity < data.threshold) {
          isWarning = true;
          lowStockItems.push(item);
        }
      }

      if (isCritical || isWarning) {
         await db.collection('alerts').add({
            hospitalId: doc.id,
            type: isCritical ? 'critical_stock' : 'low_stock',
            message: `Low stock for: ${lowStockItems.join(', ')}`,
            isRead: false,
            createdAt: new Date()
         });
      }

      let status = 'green';
      if (isCritical) {
          status = 'red';
      } else if (isWarning) {
          status = 'yellow';
      }

      // check active critical requests for this hospital
      const criticalRequests = await db.collection('supply_requests')
          .where('requestingHospitalId', '==', doc.id)
          .where('urgency', '==', 'CRITICAL')
          .where('status', 'in', ['pending', 'matched'])
          .get();

      if (!criticalRequests.empty) {
          status = 'red';
      }

      // Check if status changed
      if (hospital.status !== status) {
          await db.collection('hospitals').doc(doc.id).update({ status });
      }
    }
  } catch (error) {
    console.error("Alert verification error:", error);
  }
};

const startPolling = () => {
  // every 30 mins
  setInterval(checkThresholds, 30 * 60 * 1000);
};

module.exports = { checkThresholds, startPolling };
