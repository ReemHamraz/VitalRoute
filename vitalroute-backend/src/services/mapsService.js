const axios = require('axios');

const getEtaBatch = async (destLat, destLng, sources) => {
    if (!sources || sources.length === 0) return [];

    const destinations = `${destLat},${destLng}`;
    const origins = sources.map(s => `${s.lat},${s.lng}`).join('|');
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`;
        const response = await axios.get(url);
        
        const results = [];
        const rows = response.data.rows;
        
        sources.forEach((source, index) => {
            const element = rows[index].elements[0];
            if (element.status === 'OK') {
                results.push({
                    ...source,
                    distance: element.distance.value, // in meters
                    duration: element.duration.value // in seconds
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
        console.error("Maps API error:", error);
        return sources.map(s => ({...s, distance: Infinity, duration: Infinity}));
    }
};

const getDirections = async (originLat, originLng, destLat, destLng) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${apiKey}`;
        const response = await axios.get(url);
        
        const routeData = response.data;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`;
        
        return {
            ...routeData,
            shareableUrl: mapsUrl
        };
    } catch (error) {
        console.error("Directions API error", error);
        throw error;
    }
}

module.exports = { getEtaBatch, getDirections };
