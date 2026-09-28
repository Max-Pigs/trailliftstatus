#!/usr/bin/env python3
"""Refresh data/i90-cameras.json from the WSDOT cameras API.

    WSDOT_ACCESS_CODE=... python3 scripts/update_cameras.py

Keeps active I-90 cameras between North Bend and Ellensburg, west to east.
The access code is read from the environment and never written to the repo.
Run it when WSDOT adds or moves cameras; commit the JSON it writes.
"""
import json, os, re, sys, urllib.request

URL = ("https://wsdot.wa.gov/Traffic/api/HighwayCameras/HighwayCamerasREST.svc/"
       "GetCamerasAsJson?AccessCode=")
MP_MIN, MP_MAX = 30, 95

# Segments for the highway strip, by milepost.
SEGMENTS = [
    (0, 51.9, "West approach"),
    (51.9, 56, "Summit"),
    (56, 66, "Keechelus"),
    (66, 999, "Easton to Cle Elum"),
]

code = os.environ.get("WSDOT_ACCESS_CODE") or sys.exit("Set WSDOT_ACCESS_CODE")
cams = json.load(urllib.request.urlopen(URL + code))

out = []
for c in cams:
    loc = c["CameraLocation"]
    if loc["RoadName"] != "I-90" or not c["IsActive"]:
        continue
    # The API rounds MilePost to a whole mile; the title has the exact one ("MP 46.8").
    m = re.search(r"MP\s*([\d.]+)", c["Title"])
    mp = float(m.group(1)) if m else float(loc["MilePost"] or 0)
    if not MP_MIN <= mp <= MP_MAX:
        continue
    name = re.sub(r"^I-90\s+at\s+MP\s*[\d.]+:?\s*", "", c["Title"], flags=re.I).strip() or f"MP {mp}"
    out.append({
        "id": c["CameraID"],
        "name": name,
        "milepost": mp,
        "segment": next(s for lo, hi, s in SEGMENTS if lo <= mp < hi),
        "lat": c["DisplayLatitude"],
        "lon": c["DisplayLongitude"],
        "image": c["ImageURL"].replace("http://", "https://"),
    })

out.sort(key=lambda c: c["milepost"])
path = os.path.join(os.path.dirname(__file__), "..", "data", "i90-cameras.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)
    f.write("\n")
print(f"Wrote {len(out)} cameras to data/i90-cameras.json")
