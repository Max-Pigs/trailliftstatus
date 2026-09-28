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

// Signage: no one can scroll a Yodeck screen, so shrink the root font size
// (everything is in rem/em) until the panel's content fits the screen.
function fitToScreen() {
  const root = document.documentElement;
  const panel = document.querySelector(".panel");
  if (!panel) return;
  root.style.fontSize = "";
  let size = parseFloat(getComputedStyle(root).fontSize);
  // Also check each tile, so a long word overflowing its tile counts as not fitting.
  const tooBig = (el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  const overflows = () => tooBig(panel) || [...panel.children].some(tooBig);
  while (overflows() && size > 8) {
    size *= 0.94;
    root.style.fontSize = `${size}px`;
  }
}

function afterRender() {
  if (EMBED) postHeight();
  else fitToScreen();
}

// startPage also calls afterRender after each render; these cover images and resizes.
window.addEventListener("load", afterRender);
window.addEventListener("resize", afterRender);
if (EMBED) {
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
// Anything we don't have a color for is grey rather than a blank white tile.
const KNOWN_STATUSES = ["open", "closed", "on-hold", "delayed", "scheduled"];
function statusClass(status) {
  const s = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  return KNOWN_STATUSES.includes(s) ? s : "unknown";
}

const STATUS_MARKS = { open: "✓", closed: "✕", "on-hold": "‖", delayed: "‖" };
function statusMark(status) {
  const mark = STATUS_MARKS[statusClass(status)] ?? "•";
  return `<span class="mark" title="${escapeHtml(status)}" aria-label="${escapeHtml(status)}">${mark}</span>`;
}

const isOpen = (item) => statusClass(item?.status) === "open";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP error ${res.status} from ${new URL(url).host}`);
  const data = await res.json();
  if (data?.error) throw new Error(`API error: ${data.error}`);
  return data;
}

const fetchResort = () => fetchJson(API_URL);

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

// Fills the header's .page-status (resort banner + summary) and the footer's .updated.
// `summary` is a string, or { statusHtml } for a page that builds its own header status.
function renderPageFrame(data, summary, updatedAt) {
  const statusEl = document.querySelector(".page-status");
  if (statusEl && summary?.statusHtml != null) {
    statusEl.innerHTML = summary.statusHtml;
  } else if (statusEl) {
    const status = resortStatus(data);
    const banner = status && !resortIsOpen(data)
      ? `<span class="banner ${statusClass(status)}">Resort ${escapeHtml(status.toLowerCase())}</span>`
      : "";
    statusEl.innerHTML = banner + (summary ? `<span class="summary">${escapeHtml(summary)}</span>` : "");
  }
  const updatedEl = document.querySelector(".updated");
  const when = formatTime(updatedAt);
  if (updatedEl) updatedEl.textContent = when ? `Updated ${when}` : "";
}

// Loads now, then every REFRESH_INTERVAL_MS.
// `load(el, data)` renders the panel and may return a summary line ("3 of 8 lifts open"),
// or { statusHtml } to replace the header status entirely.
// `updatedAt(data)` picks the feed timestamp shown in the footer.
// `fetchData()` loads the page's data; defaults to the resort feed.
// A failed refresh keeps the last good render on screen instead of blanking it.
function startPage(elementId, load, updatedAt = (data) => data?.updated, fetchData = fetchResort) {
  const el = document.getElementById(elementId);
  let hasRendered = false;

  async function refresh() {
    try {
      const data = await fetchData();
      const summary = load(el, data);
      renderPageFrame(data, summary, updatedAt(data));
      hasRendered = true;
    } catch (err) {
      console.error(`Error loading ${elementId}:`, err);
      if (!hasRendered) showMessage(el, "Error loading data. Retrying shortly.", true);
    }
    afterRender();
  }

  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    setInterval(refresh, REFRESH_INTERVAL_MS);
  });
}
