// src/services/mapService.js

// Math formula to calculate straight-line distance between two GPS coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

// The replacement for Google Maps Distance Matrix
async function getEtaBatch(origins, destination) {
  // We simulate a response that looks exactly like Google Maps
  return origins.map(origin => {
    const distanceKm = getDistanceFromLatLonInKm(origin.lat, origin.lng, destination.lat, destination.lng);
    
    // Simulate Lucknow traffic: 1 km takes roughly 3 to 6 minutes
    const trafficMultiplier = Math.floor(Math.random() * 4) + 3; 
    const estimatedMinutes = Math.round(distanceKm * trafficMultiplier);

    return {
      distanceText: `${distanceKm.toFixed(1)} km`,
      distanceValue: distanceKm * 1000, // in meters
      durationText: `${estimatedMinutes} mins in current traffic`,
      durationValue: estimatedMinutes * 60 // in seconds
    };
  });
}

module.exports = { getEtaBatch };