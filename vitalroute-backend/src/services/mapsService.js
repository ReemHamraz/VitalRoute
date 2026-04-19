const getEtaBatch = async (destLat, destLng, sources) => {
  if (!sources || sources.length === 0) return [];

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not set');

  // Hard limit of 25 origins per Maps API call
  const safeSources = sources.slice(0, 25);

  const destinations = `${destLat},${destLng}`;
  // FIX 1: encodeURIComponent each coord to handle any float formatting issues
  const origins = safeSources.map(s => `${s.lat},${s.lng}`).join('|');

  // FIX 2: Add departure_time=now for traffic-aware ETA (critical for Lucknow traffic)
  // Add mode=driving explicitly
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(origins)}` +
    `&destinations=${encodeURIComponent(destinations)}` +
    `&mode=driving` +
    `&departure_time=now` +
    `&traffic_model=best_guess` +
    `&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Maps API HTTP ${response.status}`);

    const data = await response.json();

    // FIX 3: Check top-level API status before reading rows
    if (data.status !== 'OK') {
      console.error('[Maps API] Bad status:', data.status, data.error_message);
      return safeSources.map(s => ({ ...s, distance: Infinity, duration: Infinity }));
    }

    return safeSources.map((source, index) => {
      const element = data.rows[index]?.elements[0];
      if (element?.status === 'OK') {
        return {
          ...source,
          distance: element.distance.value,
          // Use duration_in_traffic when available (needs departure_time=now)
          duration: element.duration_in_traffic?.value ?? element.duration.value,
        };
      }
      return { ...source, distance: Infinity, duration: Infinity };
    });

  } catch (error) {
    console.error('[Maps API] Batch ETA error:', error.message);
    return safeSources.map(s => ({ ...s, distance: Infinity, duration: Infinity }));
  }
};

const getDirections = async (originLat, originLng, destLat, destLng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not set');

  const url = `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&mode=driving` +
    `&departure_time=now` +
    `&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Directions API HTTP ${response.status}`);

    const routeData = await response.json();

    if (routeData.status !== 'OK') {
      throw new Error(`Directions API error: ${routeData.status}`);
    }

    return {
      ...routeData,
      shareableUrl: `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`,
    };
  } catch (error) {
    console.error('[Maps API] Directions error:', error.message);
    throw error;
  }
};

module.exports = { getEtaBatch, getDirections };
