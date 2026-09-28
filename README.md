# Trail & Lift Status

Live status boards for Summit at Snoqualmie, served by GitHub Pages from `main`:
<https://max-pigs.github.io/trailliftstatus/>

| Page | URL | Shows |
| --- | --- | --- |
| `index.html` | `/trailliftstatus/` | Summit Central trails: open / closed / on hold, difficulty icon, groomed icon |
| `lifts.html` | `/trailliftstatus/lifts.html` | Summit Central lifts and their status |
| `weather.html` | `/trailliftstatus/weather.html` | Base depth, 24h snow and surface for each base area |

The same pages run on the digital signage screens and embed in the Knack app.

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

## How it works

The pages fetch `https://snoq.max-4f5.workers.dev/`, a Cloudflare worker that proxies the
resort's status feed. The worker is not
in this repo.

- `common.js`: the worker URL, refresh interval and shared helpers
- `common.css`: page background, panel, status colors, and the embed styles
- `knack/`: the Knack resize snippet and a local embed test page
- `*.png`: difficulty and groomed icons. The feed calls green runs `novice`, which uses `Beginner.png`.

To show a different area, change `AREA` near the top of the script in `index.html` or `lifts.html`.

## Editing

There is no build step. Edit a file, open it in a browser to check it, and push to `main`.
Pushing to `main` publishes it live.
