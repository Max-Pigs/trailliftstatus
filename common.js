// Shared helpers for the trail, lift and weather pages.
// Data comes from the Cloudflare worker, which proxies the Summit at Snoqualmie feed.

const API_URL = "https://snoq.max-4f5.workers.dev/";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ?embed switches to the embed styles in common.css. Inside an iframe, the page
// also posts its height so the host page (Knack) can size the frame to fit.
const EMBED = new URLSearchParams(location.search).has("embed");
if (EMBED) document.documentElement.classList.add("embed");

function postHeight() {
  if (window.parent === window) return;
  window.parent.postMessage(
    { source: "trailliftstatus", height: document.body.scrollHeight },
    "*"
  );
}

if (EMBED) {
  // startPage also posts after each render; these cover images and resizes.
  window.addEventListener("load", postHeight);
  window.addEventListener("resize", postHeight);
  document.addEventListener("DOMContentLoaded", () => {
    new ResizeObserver(postHeight).observe(document.body);
  });
}

// The feed returns a bare object instead of a one-item array in some places.
const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

// "On Hold" -> "on-hold"; matches the status classes in common.css.
const statusClass = (status) =>
  String(status ?? "").trim().toLowerCase().replace(/\s+/g, "-") || "unknown";

async function fetchResort() {
  const res = await fetch(API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(`API error: ${data.error}`);
  return data;
}

function findArea(data, name) {
  return toArray(data?.facilities?.areas?.area).find((a) => a?.name === name);
}

function showMessage(el, text, isError = false) {
  el.innerHTML = `<p class="message${isError ? " error" : ""}">${escapeHtml(text)}</p>`;
}

// Loads now, then every REFRESH_INTERVAL_MS. `load` receives the resort data.
// A failed refresh keeps the last good render on screen instead of blanking it.
function startPage(elementId, load) {
  const el = document.getElementById(elementId);
  let hasRendered = false;

  async function refresh() {
    try {
      load(el, await fetchResort());
      hasRendered = true;
      if (EMBED) postHeight();
    } catch (err) {
      console.error(`Error loading ${elementId}:`, err);
      if (!hasRendered) showMessage(el, "Error loading data. Retrying shortly.", true);
      if (EMBED) postHeight();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    setInterval(refresh, REFRESH_INTERVAL_MS);
  });
}
