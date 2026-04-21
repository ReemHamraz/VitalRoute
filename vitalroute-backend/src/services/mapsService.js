// src/services/mapsService.js

// Math formula to calculate real-world physical distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

// Notice the arguments! They now perfectly match what matching.js sends.
async function getEtaBatch(hospitalLat, hospitalLng, suppliers) {
  try {
    // 1. Ensure we are working with an array of Supplier Objects
    const suppliersArray = Array.isArray(suppliers) ? suppliers : [suppliers];

    // 2. Map over the suppliers, do the math, and attach the duration
    return suppliersArray.map(supplier => {
      // Safety check
      if (!supplier || !supplier.lat || !supplier.lng) {
        return { ...supplier, duration: 999999 }; 
      }

      const distanceKm = getDistanceFromLatLonInKm(supplier.lat, supplier.lng, hospitalLat, hospitalLng);
      
      // Simulate live traffic delay based on distance
      const trafficMultiplier = Math.floor(Math.random() * 4) + 3; 
      const estimatedMinutes = Math.round(distanceKm * trafficMultiplier);

      // We return the ENTIRE supplier object (so it keeps its .id), plus the new duration property!
      return {
        ...supplier,
        duration: estimatedMinutes * 60 // matching.js sorts by duration in seconds (Line 38)
      };
    });

  } catch (err) {
    console.error("Mock Map Service Crash:", err);
    return suppliers; // Fail gracefully
  }
}

module.exports = { getEtaBatch };