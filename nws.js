// Shared National Weather Service helpers for forecast.html and discussion.html.
// api.weather.gov is free, needs no key, and allows browser requests.

// Snoqualmie Pass, from the lat/long of weather.gov's point forecast for the pass.
const NWS_POINT = { lat: 47.4264, lon: -121.4173 };
const NWS_GRID = "https://api.weather.gov/gridpoints/SEW/152,54";
const NWS_OFFICE = "SEW"; // NWS Seattle
