const { db, FieldValue } = require('../config/firebase'); // ensure FieldValue is imported

const checkThresholds = async () => {
  try {
    const hospitalsSnapshot = await db.collection('hospitals').get();
    
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
         const alertType = isCritical ? 'critical_stock' : 'low_stock';
         
         // SPAM PREVENTION: Check if an unread alert already exists
         const existingAlerts = await db.collection('alerts')
            .where('hospitalId', '==', doc.id)
            .where('type', '==', alertType)
            .where('isRead', '==', false)
            .get();

         if (existingAlerts.empty) {
             await db.collection('alerts').add({
                hospitalId: doc.id,
                type: alertType,
                message: `Low stock for: ${lowStockItems.join(', ')}`,
                isRead: false,
                createdAt: FieldValue.serverTimestamp() // Use server time, not local Node time
             });
         }
      }

      let status = 'green';
      if (isCritical) {
          status = 'red';
      } else if (isWarning) {
          status = 'yellow';
      }

      const criticalRequests = await db.collection('supply_requests')
          .where('requestingHospitalId', '==', doc.id)
          .where('urgency', '==', 'CRITICAL')
          .where('status', 'in', ['pending', 'matched'])
          .get();

      if (!criticalRequests.empty) {
          status = 'red';
      }

      if (hospital.status !== status) {
          await db.collection('hospitals').doc(doc.id).update({ status });
      }
    }
  } catch (error) {
    console.error("Alert verification error:", error);
  }
};

const startPolling = () => {
  setInterval(checkThresholds, 30 * 60 * 1000);
};

module.exports = { checkThresholds, startPolling };
