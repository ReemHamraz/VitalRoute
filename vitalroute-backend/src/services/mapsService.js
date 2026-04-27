
// Math formula to calculate real-world physical distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}


async function getEtaBatch(hospitalLat, hospitalLng, suppliers) {
  try {
    const suppliersArray = Array.isArray(suppliers) ? suppliers : [suppliers];

    
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
        duration: estimatedMinutes * 60 
      };
    });

  } catch (err) {
    console.error("Mock Map Service Crash:", err);
    return suppliers; // Fail gracefully
  }
}

module.exports = { getEtaBatch };
