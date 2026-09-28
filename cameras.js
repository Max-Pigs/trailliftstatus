// Which WSDOT cams the I-90 Pass page (pass.html) shows, by camera id.
// Every id is listed in data/i90-cameras.json; cameras.html shows them on a map
// and builds this list for you. Order doesn't matter: the page sorts west to east.
const SHOWN_CAMERAS = [
  9425, // North Bend, MP 33.2
  9029, // Denny Creek, MP 46.8
  1099, // Franklin Falls, MP 51.3
  1100, // Snoqualmie Summit, MP 52.0
  9428, // East Snoqualmie Summit, MP 53.4
  1102, // Hyak, MP 55.1
  9434, // Old Keechelus Snow Shed, MP 57.7
  9918, // Price Creek, MP 61.1
  1103, // Easton, MP 70.6
];

const CAMERA_CATALOG_URL = "data/i90-cameras.json";
const CAMERA_REFRESH_MS = 60 * 1000; // WSDOT updates most cams about once a minute
