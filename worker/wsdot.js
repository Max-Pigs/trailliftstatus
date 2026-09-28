// Cloudflare Worker: Snoqualmie Pass report from WSDOT, for pass.html and conditions.html.
//
// WSDOT's API needs an access code and doesn't allow browser requests, so this
// worker calls it server-side and returns a small JSON the pages can read.
//
// Setup (Cloudflare dashboard):
//   1. Workers & Pages -> Create -> Worker, name it e.g. "wsdot". Paste this file. Deploy.
//   2. The worker -> Settings -> Variables and Secrets -> Add, type Secret,
//      name WSDOT_ACCESS_CODE, value = your WSDOT access code.
//   3. Put the worker's URL in WSDOT_WORKER_URL in common.js.
// To update: open the worker -> Edit code, paste this file over it, Deploy.
//
// Response (cached 5 minutes):
//   { name, elevationFt, updated, eastbound, westbound, roadCondition,
//     weatherCondition, temperatureF, advisoryActive,
//     alerts: [{ id, priority, category, headline, direction, startMp, endMp, updated }] | null,
//     travelTimes: [{ direction, route, current, average, updated }] | null }
// alerts / travelTimes are null when that WSDOT feed fails; the pass report still returns.

const SNOQUALMIE_PASS_ID = 11;
const CACHE_SECONDS = 300;

// I-90 alerts between these mileposts (North Bend to Easton) are included.
const ALERT_MP_MIN = 30;
const ALERT_MP_MAX = 75;
const TRAVEL_TIME_NAMES = ["Snoqualmie Pass EB", "Snoqualmie Pass WB"];

const API = "https://wsdot.wa.gov/Traffic/api";
// Note "AsJon": that's WSDOT's actual endpoint name.
const PASS_URL = `${API}/MountainPassConditions/MountainPassConditionsREST.svc/GetMountainPassConditionAsJon`;
const ALERTS_URL = `${API}/HighwayAlerts/HighwayAlertsREST.svc/GetAlertsAsJson`;
const TRAVEL_URL = `${API}/TravelTimes/TravelTimesREST.svc/GetTravelTimesAsJson`;

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

const DIRECTIONS = { e: "Eastbound", w: "Westbound", b: "Both directions" };
const directionName = (d) => DIRECTIONS[String(d ?? "").toLowerCase()] ?? null;

function restriction(pass, direction) {
  const r = [pass.RestrictionOne, pass.RestrictionTwo].find(
    (x) => x?.TravelDirection?.toLowerCase() === direction
  );
  return r?.RestrictionText?.trim() || null;
}

export function normalizePass(pass) {
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

const PRIORITY_ORDER = ["highest", "high", "medium", "low", "lowest"];

export function normalizeAlerts(alerts) {
  const onStretch = (loc) =>
    loc?.RoadName === "090" && loc.MilePost >= ALERT_MP_MIN && loc.MilePost <= ALERT_MP_MAX;
  return alerts
    .filter((a) => a.EventStatus !== "Closed")
    .filter((a) => onStretch(a.StartRoadwayLocation) || onStretch(a.EndRoadwayLocation))
    .map((a) => ({
      id: a.AlertID,
      priority: a.Priority,
      category: a.EventCategory,
      headline: a.HeadlineDescription?.trim() || "",
      direction: directionName(a.StartRoadwayLocation?.Direction),
      startMp: a.StartRoadwayLocation?.MilePost || null,
      endMp: a.EndRoadwayLocation?.MilePost || null,
      updated: parseWsdotDate(a.LastUpdatedTime),
    }))
    .sort((a, b) =>
      PRIORITY_ORDER.indexOf(String(a.priority).toLowerCase()) -
        PRIORITY_ORDER.indexOf(String(b.priority).toLowerCase()) ||
      (a.startMp ?? 0) - (b.startMp ?? 0)
    );
}

export function normalizeTravelTimes(times) {
  return TRAVEL_TIME_NAMES
    .map((name) => times.find((t) => t.Name === name))
    .filter(Boolean)
    .map((t) => ({
      direction: directionName(t.StartPoint?.Direction) ?? t.Name,
      route: t.Description,
      current: t.CurrentTime,
      average: t.AverageTime,
      updated: parseWsdotDate(t.TimeUpdated),
    }));
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WSDOT returned ${res.status}`);
  return res.json();
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!env.WSDOT_ACCESS_CODE) return json({ error: "WSDOT_ACCESS_CODE secret is not set" }, 500);

    const cache = caches.default;
    const cacheKey = new Request(new URL("/snoqualmie-v2", request.url).toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const code = `AccessCode=${encodeURIComponent(env.WSDOT_ACCESS_CODE)}`;
    const [pass, alerts, times] = await Promise.allSettled([
      getJson(`${PASS_URL}?${code}&PassConditionID=${SNOQUALMIE_PASS_ID}`),
      getJson(`${ALERTS_URL}?${code}`),
      getJson(`${TRAVEL_URL}?${code}`),
    ]);
    if (pass.status === "rejected") return json({ error: String(pass.reason?.message ?? pass.reason) }, 502);

    const body = {
      ...normalizePass(pass.value),
      alerts: alerts.status === "fulfilled" ? normalizeAlerts(alerts.value) : null,
      travelTimes: times.status === "fulfilled" ? normalizeTravelTimes(times.value) : null,
    };
    const res = json(body, 200, { "Cache-Control": `public, max-age=${CACHE_SECONDS}` });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
