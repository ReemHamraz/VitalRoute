const { db, FieldValue } = require('../config/firebase');

const checkThresholds = async () => {
  try {
    const hospitalsSnapshot = await db.collection('hospitals').get();

    // Fetching ALL active critical requests in ONE query, not N queries inside the loop
    const criticalRequestsSnap = await db.collection('supply_requests')
      .where('urgency', '==', 'CRITICAL')
      .where('status', 'in', ['pending', 'matched'])
      .get();

    const criticalHospitalIds = new Set(
      criticalRequestsSnap.docs.map(d => d.data().requestingHospitalId)
    );

    // Batch all hospital status updates together
    const batch = db.batch();
    let batchHasUpdates = false;

    for (const doc of hospitalsSnapshot.docs) {
      const hospital = doc.data();
      const inventory = hospital.inventory || {};

      let isCritical = false;
      let isWarning = false;
      const lowStockItems = [];

      for (const [item, data] of Object.entries(inventory)) {
        if (typeof data.quantity !== 'number') continue;
        if (data.quantity === 0) {
          isCritical = true;
          lowStockItems.push(item);
        } else if (data.quantity < (data.threshold ?? 0)) {
          isWarning = true;
          lowStockItems.push(item);
        }
      }

      // Spam prevention — only write alert if no unread one exists
      if (isCritical || isWarning) {
        const alertType = isCritical ? 'critical_stock' : 'low_stock';
        const existingAlerts = await db.collection('alerts')
          .where('hospitalId', '==', doc.id)
          .where('type', '==', alertType)
          .where('isRead', '==', false)
          .limit(1)  
          .get();

        if (existingAlerts.empty) {
          await db.collection('alerts').add({
            hospitalId: doc.id,
            type:       alertType,
            message:    `Low stock detected: ${lowStockItems.join(', ')}`,
            isRead:     false,
            createdAt:  FieldValue.serverTimestamp(),
          });
        }
      }

      // Compute new status
      let newStatus = 'green';
      if (isCritical || criticalHospitalIds.has(doc.id)) {
        newStatus = 'red';
      } else if (isWarning) {
        newStatus = 'yellow';
      }

      // Only write to Firestore if status actually changed
      if (hospital.status !== newStatus) {
        batch.update(db.collection('hospitals').doc(doc.id), { status: newStatus });
        batchHasUpdates = true;
      }
    }

    if (batchHasUpdates) await batch.commit();
    console.log(`[AlertService] Threshold check complete at ${new Date().toISOString()}`);

  } catch (error) {
    console.error('[AlertService] Check failed:', error.message);
  }
};

const startPolling = () => {
  
  checkThresholds();
  setInterval(checkThresholds, 30 * 60 * 1000);
};

module.exports = { checkThresholds, startPolling };
