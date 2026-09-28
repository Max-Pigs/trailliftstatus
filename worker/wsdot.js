// Cloudflare Worker: Snoqualmie Pass conditions from WSDOT, for pass.html.
//
// WSDOT's API needs an access code and doesn't allow browser requests, so this
// worker calls it server-side and returns a small JSON the page can read.
//
// Setup (Cloudflare dashboard):
//   1. Workers & Pages -> Create -> Worker, name it e.g. "wsdot". Paste this file. Deploy.
//   2. The worker -> Settings -> Variables and Secrets -> Add, type Secret,
//      name WSDOT_ACCESS_CODE, value = your WSDOT access code.
//   3. Put the worker's URL (https://wsdot.<you>.workers.dev/) in WSDOT_WORKER_URL in pass.html.
//
// Response (cached 5 minutes):
//   { name, elevationFt, updated, eastbound, westbound, roadCondition,
//     weatherCondition, temperatureF, advisoryActive }

const SNOQUALMIE_PASS_ID = 11;
const CACHE_SECONDS = 300;

// Note "AsJon": that's WSDOT's actual endpoint name.
const WSDOT_URL =
  "https://wsdot.wa.gov/Traffic/api/MountainPassConditions/MountainPassConditionsREST.svc/GetMountainPassConditionAsJon";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });

// WSDOT dates look like "/Date(1789368941067-0700)/".
function parseWsdotDate(s) {
  const m = /Date\((\d+)/.exec(s ?? "");
  return m ? new Date(Number(m[1])).toISOString() : null;
}

function restriction(pass, direction) {
  const r = [pass.RestrictionOne, pass.RestrictionTwo].find(
    (x) => x?.TravelDirection?.toLowerCase() === direction
  );
  return r?.RestrictionText?.trim() || null;
}

export function normalize(pass) {
  return {
    name: pass.MountainPassName,
    elevationFt: pass.ElevationInFeet,
    updated: parseWsdotDate(pass.DateUpdated),
    eastbound: restriction(pass, "eastbound"),
    westbound: restriction(pass, "westbound"),
    roadCondition: pass.RoadCondition?.trim() || null,
    weatherCondition: pass.WeatherCondition?.trim() || null,
    temperatureF: pass.TemperatureInFahrenheit,
    advisoryActive: pass.TravelAdvisoryActive === true,
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!env.WSDOT_ACCESS_CODE) return json({ error: "WSDOT_ACCESS_CODE secret is not set" }, 500);

    const cache = caches.default;
    const cacheKey = new Request(new URL("/snoqualmie", request.url).toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const url = `${WSDOT_URL}?AccessCode=${encodeURIComponent(env.WSDOT_ACCESS_CODE)}` +
      `&PassConditionID=${SNOQUALMIE_PASS_ID}`;
    const upstream = await fetch(url);
    if (!upstream.ok) return json({ error: `WSDOT returned ${upstream.status}` }, 502);

    let pass;
    try {
      pass = await upstream.json();
    } catch {
      return json({ error: "WSDOT returned something that isn't JSON" }, 502);
    }

    const res = json(normalize(pass), 200, { "Cache-Control": `public, max-age=${CACHE_SECONDS}` });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
