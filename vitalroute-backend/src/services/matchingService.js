const { db } = require('../config/firebase');
const { getEtaBatch } = require('./mapsService');

const matchRequest = async (requestId) => {
    const requestRef = db.collection('supply_requests').doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) throw new Error('Request not found');
    const request = requestDoc.data();

    const requestingHospitalDoc = await db.collection('hospitals').doc(request.requestingHospitalId).get();
    if (!requestingHospitalDoc.exists) throw new Error('Requesting hospital not found');
    const destLat = requestingHospitalDoc.data().lat;
    const destLng = requestingHospitalDoc.data().lng;

    const allMatches = [];
    
    for (const item of request.items || []) {
        let sources = [];
        
        const hospitals = await db.collection('hospitals').get();
        hospitals.forEach(doc => {
            if (doc.id === request.requestingHospitalId) return;
            const data = doc.data();
            const inv = data.inventory && data.inventory[item.name];
            if (inv && inv.quantity >= (item.quantity || 1)) {
                sources.push({ sourceId: doc.id, sourceName: data.name, sourceType: 'hospital', lat: data.lat, lng: data.lng, available: inv.quantity });
            }
        });

        const suppliers = await db.collection('suppliers').get();
        suppliers.forEach(doc => {
            const data = doc.data();
            const inv = data.inventory && data.inventory[item.name];
            if (inv && inv.quantity >= (item.quantity || 1)) {
                sources.push({ sourceId: doc.id, sourceName: data.name, sourceType: data.type, lat: data.lat, lng: data.lng, available: inv.quantity });
            }
        });

        if (sources.length === 0) continue;

        const sourcesWithEta = await getEtaBatch(destLat, destLng, sources);
        const validSources = sourcesWithEta.filter(s => s.distance <= 50000);
        
        if (validSources.length === 0) {
            await db.collection('alerts').add({
                hospitalId: request.requestingHospitalId,
                type: 'escalation',
                message: `No match found within 50km for ${item.name}`,
                isRead: false,
                createdAt: new Date()
            });
            continue;
        }

        const scoredSources = validSources.map(s => {
            const distanceScore = 1 - (s.distance / 50000);
            const ratio = s.available / (item.quantity || 1);
            const cappedRatio = Math.min(ratio, 5); 
            const stockScore = cappedRatio / 5;
            
            const score = (0.6 * distanceScore) + (0.4 * stockScore);
            return {
                sourceId: s.sourceId,
                sourceName: s.sourceName,
                sourceType: s.sourceType,
                distance: s.distance,
                eta: s.duration,
                itemsAvailable: s.available,
                score
            };
        });

        scoredSources.sort((a,b) => b.score - a.score);
        const top3 = scoredSources.slice(0, 3);
        
        // Push the matches with a reference to the item
        allMatches.push(...top3.map(m => ({ ...m, itemName: item.name })));
    }

    await requestRef.update({
        matches: allMatches,
        status: 'matched',
        updatedAt: new Date()
    });

    await db.collection('alerts').add({
        hospitalId: request.requestingHospitalId,
        type: 'request_matched',
        message: `Your request for supplies has been matched.`,
        isRead: false,
        createdAt: new Date()
    });

    return allMatches;
};

module.exports = { matchRequest };
