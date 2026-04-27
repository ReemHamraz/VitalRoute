const { db } = require('../config/firebase');
const { getEtaBatch } = require('./mapsService');

// ── Inventory key normalizer ──────────────────────────────────────────────────
// Gemini returns natural language names. Firestore uses snake_case keys.
// This maps Gemini output → our Firestore inventory schema.
const normalizeItemKey = (name = '') => {
  const n = name.toLowerCase().trim();
  if (n.includes('o-negative') || n.includes('o negative'))  return 'blood_O_negative';
  if (n.includes('a-positive') || n.includes('a positive'))  return 'blood_A_positive';
  if (n.includes('b-positive') || n.includes('b positive'))  return 'blood_B_positive';
  if (n.includes('ab-positive')|| n.includes('ab positive')) return 'blood_AB_positive';
  if (n.includes('blood'))                                    return 'blood_O_negative'; // fallback
  if (n.includes('oxygen') || n.includes('o2'))              return 'oxygen_tanks';
  if (n.includes('ventilator'))                              return 'ventilators';
  if (n.includes('morphine'))                                return 'morphine_vials';
  if (n.includes('epinephrine') || n.includes('epi'))        return 'epinephrine';
  
  return n.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
};

// ── Core matching function ────────────────────────────────────────────────────
const matchRequest = async (requestId) => {
  const requestRef = db.collection('supply_requests').doc(requestId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) throw new Error('Request not found');

  const request = requestDoc.data();
  const items = request.items || [];
  if (items.length === 0) throw new Error('Request has no items');

  // Fetch requesting hospital
  const hospitalDoc = await db.collection('hospitals').doc(request.requestingHospitalId).get();
  if (!hospitalDoc.exists) throw new Error('Requesting hospital not found');
  const { lat: destLat, lng: destLng } = hospitalDoc.data();

  // ── Fetch ALL hospitals + suppliers ONCE (not per item) ────────────────────
  const [hospitalsSnap, suppliersSnap] = await Promise.all([
    db.collection('hospitals').get(),
    db.collection('suppliers').get(),
  ]);

  const hospitals = [];
  hospitalsSnap.forEach(doc => {
    if (doc.id !== request.requestingHospitalId) {
      hospitals.push({ id: doc.id, ...doc.data(), _collection: 'hospital' });
    }
  });

  const suppliers = [];
  suppliersSnap.forEach(doc => {
    suppliers.push({ id: doc.id, ...doc.data(), _collection: 'supplier' });
  });

  const allSources = [...hospitals, ...suppliers];

  // ── Process each item in PARALLEL ─────────────────────────────────────────
  const itemMatchPromises = items.map(async (item) => {
    const qty = item.quantity ?? 1; // treat null as 1
    const inventoryKey = normalizeItemKey(item.name);

    // Filter sources that have enough stock
    const eligible = allSources.filter(source => {
      const inv = source.inventory?.[inventoryKey];
      return inv && typeof inv.quantity === 'number' && inv.quantity >= qty;
    }).map(source => ({
      sourceId:   source.id,
      sourceName: source.name,
      sourceType: source._collection === 'hospital' ? 'hospital' : (source.type || 'supplier'),
      lat:        source.lat,
      lng:        source.lng,
      available:  source.inventory[inventoryKey].quantity,
    }));

    if (eligible.length === 0) {
      // Write escalation alert and skip this item
      await db.collection('alerts').add({
        hospitalId: request.requestingHospitalId,
        type:       'escalation',
        message:    `No source found for ${item.name} (qty: ${qty}) within network`,
        isRead:     false,
        createdAt:  new Date(),
      });
      return { itemName: item.name, itemKey: inventoryKey, matches: [] };
    }

    // Get ETAs in ONE batch call to Distance Matrix API
    const sourcesWithEta = await getEtaBatch(destLat, destLng, eligible);

    // Filter to 50km radius
    const inRange = sourcesWithEta.filter(s => s.distance <= 50000);

    if (inRange.length === 0) {
      await db.collection('alerts').add({
        hospitalId: request.requestingHospitalId,
        type:       'escalation',
        message:    `No source within 50km for ${item.name}`,
        isRead:     false,
        createdAt:  new Date(),
      });
      return { itemName: item.name, itemKey: inventoryKey, matches: [] };
    }

    // Score and rank
    const scored = inRange.map(s => {
      const distanceScore = 1 - (s.distance / 50000);           // 0–1, closer = higher
      const stockScore    = Math.min(s.available / qty, 5) / 5; // 0–1, capped at 5x requested
      const score         = (0.6 * distanceScore) + (0.4 * stockScore);
      return {
        sourceId:       s.sourceId,
        sourceName:     s.sourceName,
        sourceType:     s.sourceType,
        distanceMeters: Math.round(s.distance),
        etaSeconds:     s.duration,
        etaMinutes:     Math.round(s.duration / 60),
        itemsAvailable: s.available,
        score:          parseFloat(score.toFixed(3)),
        itemName:       item.name,
        itemKey:        inventoryKey,
      };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    return { itemName: item.name, itemKey: inventoryKey, matches: scored };
  });

  const itemResults = await Promise.all(itemMatchPromises);

  // Flatten for Firestore storage but keep item grouping
  const allMatches = itemResults.flatMap(r => r.matches);
  const hasAnyMatch = allMatches.length > 0;

  // Update request doc
  await requestRef.update({
    matches:       itemResults,   // structured by item — better for frontend
    flatMatches:   allMatches,    // flat list — easier for notifications
    status:        hasAnyMatch ? 'matched' : 'no_match',
    updatedAt:     new Date(),
  });

  // Notify hospital if matched
  if (hasAnyMatch) {
    await db.collection('alerts').add({
      hospitalId: request.requestingHospitalId,
      type:       'request_matched',
      message:    `Matches found for your supply request. Top ETA: ${allMatches[0]?.etaMinutes ?? '?'} min from ${allMatches[0]?.sourceName ?? 'nearby source'}.`,
      isRead:     false,
      createdAt:  new Date(),
    });
  }

  return itemResults;
};

module.exports = { matchRequest };
