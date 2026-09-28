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

// "Open", "Closed", ... or "" when the feed doesn't say.
const resortStatus = (data) => String(data?.operations?.resortStatus ?? "").trim();
const resortIsOpen = (data) => resortStatus(data).toLowerCase() === "open";

// Feed timestamps are UTC; the resort is in Pacific time. -> "Sep 25, 10:03 AM"
function formatTime(iso) {
  const d = new Date(iso);
  if (!iso || isNaN(d)) return "";
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// Banner (resort not open) and "Updated ..." line, as full-width rows of the panel grid.
function addPageFrame(el, data, updatedAt) {
  const status = resortStatus(data);
  if (status && !resortIsOpen(data)) {
    el.insertAdjacentHTML("afterbegin",
      `<div class="banner ${statusClass(status)}">Resort ${escapeHtml(status.toLowerCase())}</div>`);
  }
  const when = formatTime(updatedAt);
  if (when) el.insertAdjacentHTML("beforeend", `<p class="updated">Updated ${escapeHtml(when)}</p>`);
}

// Loads now, then every REFRESH_INTERVAL_MS. `load` receives the resort data.
// `updatedAt(data)` picks the feed timestamp shown in the footer.
// A failed refresh keeps the last good render on screen instead of blanking it.
function startPage(elementId, load, updatedAt = (data) => data?.updated) {
  const el = document.getElementById(elementId);
  let hasRendered = false;

  async function refresh() {
    try {
      const data = await fetchResort();
      load(el, data);
      addPageFrame(el, data, updatedAt(data));
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
