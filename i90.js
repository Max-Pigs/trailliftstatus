// Shared I-90 helpers for pass.html (overview) and conditions.html.
// Needs common.js and cameras.js loaded first.

let cameraCatalog = null;
async function loadCameraCatalog() {
  cameraCatalog ??= await fetchJson(CAMERA_CATALOG_URL);
  return cameraCatalog;
}

// The pass report from the wsdot worker, or null if it can't be reached.
const fetchWsdot = () =>
  fetchJson(WSDOT_WORKER_URL).catch((err) => { console.error("WSDOT worker:", err); return null; });

// Cams by id, west to east.
const camerasById = (catalog, ids) =>
  catalog.filter((c) => ids.includes(c.id)).sort((a, b) => a.milepost - b.milepost);

// ===== Restrictions =====

// "No restrictions" -> green, closed / chains required -> red, anything else -> yellow.
function restrictionClass(text) {
  const t = String(text ?? "").toLowerCase();
  if (!t) return "unknown";
  if (t.includes("no restriction")) return "open";
  if (/\bclosed\b|chains?\b.*\brequired/.test(t)) return "closed";
  return "on-hold";
}

// A few words for the overview header; the full text is on the conditions page.
function restrictionShort(text) {
  const t = String(text ?? "").toLowerCase();
  if (!t) return "No report";
  if (t.includes("no restriction")) return "No restrictions";
  if (/\bclosed\b/.test(t)) return "Closed";
  if (/chains?\b.*\brequired/.test(t)) return "Chains required";
  if (/traction tires/.test(t)) return "Traction tires advised";
  return "Restrictions";
}

// ===== Camera facing =====

const FACING = {
  E: { arrow: "→", label: "Looking east" },
  W: { arrow: "←", label: "Looking west" },
  BOTH: { arrow: "⇄", label: "Looking both ways" },
};
const facingOf = (cam) => FACING[String(CAMERA_FACING[cam.id] ?? "").toUpperCase()] ?? null;

function facingBadge(cam) {
  const f = facingOf(cam);
  return f ? `<span class="facing" title="${f.label}" aria-label="${f.label}">${f.arrow}</span>` : "";
}

// ===== Camera tiles =====

// `num` is the pin number on the overview strip; omit it elsewhere.
function renderCamTile(cam, num) {
  return `<div class="cam" data-id="${cam.id}">
    <div class="label">
      ${num ? `<span class="num">${num}</span>` : ""}
      <span class="cam-name">${escapeHtml(cam.name)}</span>
      ${facingBadge(cam)}
      <span class="mp">MP ${cam.milepost}</span>
    </div>
    <img src="${escapeHtml(cam.image)}?t=${Date.now()}" alt="${escapeHtml(cam.name)} camera">
  </div>`;
}

// After tiles render: refit once images load, dim a cam whose image fails.
function watchCamImages(root) {
  root.querySelectorAll(".cam img").forEach((img) => {
    img.addEventListener("load", afterRender, { once: true });
    img.addEventListener("error", () => img.closest(".cam").classList.add("stale"), { once: true });
  });
}

// Swap each image for a fresh one once it has loaded, so screens never flash blank.
// A cam that fails to refresh keeps its last image, dimmed.
function refreshCamImages() {
  document.querySelectorAll(".cam").forEach((tile) => {
    const img = tile.querySelector("img");
    const next = new Image();
    next.onload = () => { img.src = next.src; tile.classList.remove("stale"); };
    next.onerror = () => tile.classList.add("stale");
    next.src = img.src.replace(/\?t=\d+/, "") + `?t=${Date.now()}`;
  });
}
setInterval(refreshCamImages, CAMERA_REFRESH_MS);
