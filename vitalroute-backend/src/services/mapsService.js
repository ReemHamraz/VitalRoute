// Native fetch used (Node 18+) — no axios needed

const getEtaBatch = async (destLat, destLng, sources) => {
    if (!sources || sources.length === 0) return [];

    // Google Maps API hard limit is 25 origins per request.
    // Slice the top 25 to prevent the whole batch from crashing.
    const safeSources = sources.slice(0, 25); 
    
    const destinations = `${destLat},${destLng}`;
    const origins = safeSources.map(s => `${s.lat},${s.lng}`).join('|');
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const results = [];
        const rows = data.rows;
        
        safeSources.forEach((source, index) => {
            const element = rows[index].elements[0];
            if (element.status === 'OK') {
                results.push({
                    ...source,
                    distance: element.distance.value, // in meters
                    duration: element.duration.value  // in seconds
                });
            } else {
                results.push({
                    ...source,
                    distance: Infinity,
                    duration: Infinity
                });
            }
        });
        return results;
    } catch (error) {
        console.error("[Maps API] Batch ETA error:", error);
        return safeSources.map(s => ({...s, distance: Infinity, duration: Infinity}));
    }
};

const getDirections = async (originLat, originLng, destLat, destLng) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${apiKey}`;
        const response = await fetch(url);
        const routeData = await response.json();
        
        // Corrected format for a universal Google Maps directions link
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`;
        
        return {
            ...routeData,
            shareableUrl: mapsUrl
        };
    } catch (error) {
        console.error("[Maps API] Directions error:", error);
        throw error;
    }
}

module.exports = { getEtaBatch, getDirections };
