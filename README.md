# Trail & Lift Status

Live status boards for Summit at Snoqualmie, served by GitHub Pages from `main`:
<https://max-pigs.github.io/trailliftstatus/>

| Page | URL | Shows |
| --- | --- | --- |
| `index.html` | `/trailliftstatus/` | Summit Central trails, Beginner → Expert then A–Z: open / closed / on hold, groomed |
| `lifts.html` | `/trailliftstatus/lifts.html` | Summit Central lifts and their status |
| `forecast.html` | `/trailliftstatus/forecast.html` | NWS Forecast (NWS only): active watches/warnings for the pass, new snow 24h/48h and snow level, next 6 periods with NWS's detailed descriptions |
| `discussion.html` | `/trailliftstatus/discussion.html` | NWS Forecast Discussion (Seattle office): synopsis, short term, long term. Covers western WA, not just the pass |
| `avalanche.html` | `/trailliftstatus/avalanche.html` | NWAC Avalanche Forecast for Snoqualmie Pass: danger by elevation band, bottom line, problems, discussion; NWAC's seasonal statement between seasons |
| `pass.html` | `/trailliftstatus/pass.html` | I-90 Overview: highway strip, chosen WSDOT cams west to east with which way each looks, short EB/WB restriction chips |
| `conditions.html` | `/trailliftstatus/conditions.html` | Snoqualmie Pass Conditions: full EB/WB restrictions, WSDOT road and weather report, travel time vs normal, I-90 alerts, 2 featured cams |
| `cameras.html` | `/trailliftstatus/cameras.html` | Not for signage: a map of the I-90 cams for choosing which ones `pass.html` shows |
| `weather.html` | `/trailliftstatus/weather.html` | Snow Conditions: base depth, 24h snow and surface for each base area |

The same pages run on the digital signage screens (Yodeck, portrait or landscape)
and embed in the Knack app.

## Signage (Yodeck)

Use the plain URLs. Each page fills the screen with no scrolling, picks columns for
portrait or landscape, and shrinks its text only when the content wouldn't otherwise fit
(for example, a long trail name or more trails than usual). Checked at 1920×1080 and 1080×1920.
Column counts are the `--cols` / `--cols-portrait` values at the top of each page.

Every page refreshes itself every 5 minutes. If a refresh fails, the last good data stays on screen.

## Embedding in Knack

Add `?embed` to the page URL. The page then gets a transparent background, loses its
card shadow, and sizes to its content instead of filling the screen.

1. In Knack, go to **Settings → API & Code → JavaScript** and paste in [`knack/custom.js`](knack/custom.js).
   It resizes each embedded frame to fit, so there's no inner scrollbar or blank gap.
   Add it once and it covers every embed.
2. On any page, add a **Rich Text** view, switch it to HTML/source, and paste:

   ```html
   <iframe src="https://max-pigs.github.io/trailliftstatus/lifts.html?embed"
           style="width:100%;border:0;height:300px" title="Lift status"></iframe>
   ```

   Use `/trailliftstatus/?embed` for trails and `/trailliftstatus/weather.html?embed` for weather.
   The `300px` is only a starting height; the snippet from step 1 corrects it once the page loads.

Signage URLs stay as they are, without `?embed`.

To test locally, run `python3 -m http.server 8080` and open
<http://localhost:8080/knack/test.html>. It embeds all three pages the way Knack does.

## Weather sources, one per page

Each weather page shows a single source, so it's always clear whose forecast you're reading:
NWS (`forecast.html`, `discussion.html`), NWAC (`avalanche.html`), WSDOT (`conditions.html`), and the
resort feed (`weather.html`, Snow Conditions). NWS and NWAC are read straight from their public APIs
(no key, no worker). Long NWAC text is cut at whole paragraphs on signage; embeds show all of it.

## How it works

The pages fetch `https://snoq.max-4f5.workers.dev/`, a Cloudflare worker that proxies the
resort's status feed. The worker is not
in this repo.

- `common.js`: the worker URL, refresh interval and shared helpers
- `common.css`: page background, panel, status colors, and the embed styles
- `knack/`: the Knack resize snippet and a local embed test page
- `*.png`: difficulty and groomed icons. The feed calls green runs `novice`, which uses `Beginner.png`.

To show a different area, change `AREA` near the top of the script in `index.html` or `lifts.html`.

## I-90 cameras and road report

- **Which cams show, and which way they look:** open `cameras.html`, tick cams and set each one's
  facing (→ East, ← West, ⇄ Both), press Copy, and paste over `SHOWN_CAMERAS` and `CAMERA_FACING`
  in `cameras.js`. WSDOT's data doesn't say which way cams face, so this is ours to keep.
  The overview sorts cams west to east and picks the column count that makes the images largest.
- **Featured cams** on the conditions page: `FEATURED_CAMERAS` in `cameras.js`.
- **Camera catalog:** `data/i90-cameras.json` holds every active I-90 cam from North Bend to
  Ellensburg (name, milepost, location, image URL). Refresh it when WSDOT adds cams:
  `WSDOT_ACCESS_CODE=... python3 scripts/update_cameras.py`, then commit the JSON.
- **Road report, alerts, travel times:** WSDOT needs an access code and blocks browser requests, so
  the pages read it through a separate Cloudflare worker, `worker/wsdot.js`, deployed at
  `https://wsdot.max-4f5.workers.dev/` (`WSDOT_WORKER_URL` in `common.js`). Setup and update steps are
  at the top of that file. Never commit the access code; it lives only in the worker's secret.

## Split screens

Every page fits whatever box it's given, so Yodeck multi-zone layouts work. Checked at full screen,
half width (960×1080) and half height (1920×540). Text shrinks to fit, so busy pages in small zones
(e.g. conditions on a winter day at half height) get small; give those a bigger zone.

## Editing

There is no build step. Edit a file, open it in a browser to check it, and push to `main`.
Pushing to `main` publishes it live.
