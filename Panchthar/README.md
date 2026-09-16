# MNH Readiness QI Dashboard

A zero-build, static web dashboard for the **Maternal & Newborn Health (MNH) Readiness Quality Improvement** assessment tool. It reads the **live Google Sheet** of KoboToolbox submissions and presents four interactive views:

1. **Portfolio** — all facilities at a glance: KPI cards, sortable scorecard table, and a GPS map (markers coloured by status).
2. **Facility scorecard** — per-assessment report mirroring the Excel `Report` sheet: 13 domain bars + radar, BEONC signal functions, Part C monthly service data, and the action plan.
3. **Trends** — compare a facility's 1st / 2nd / 3rd assessments over time with per-domain change (Δ).
4. **Service data** — aggregated Part C across facilities: total deliveries, C-section rate, delivery types, obstetric-complication breakdown, deliveries by facility, and adverse outcomes (maternal/neonatal deaths, stillbirths, referrals).

All scores and 🟢/🟡/🔴 traffic lights are **recomputed in the browser** from the raw `0/1` answers, so the dashboard does not depend on the (emoji-mangled) score columns in the export.

## Files
| File | Purpose |
|---|---|
| `index.html` | Page markup + CDN libraries (Leaflet, Chart.js, PapaParse) |
| `app.js` | Data fetch, CSV parsing, scoring config, all four views |
| `styles.css` | Layout + traffic-light theming |
| `config.js` | **The one file you edit** — the Google Sheet CSV URL |
| `MNH_QI_Tool_XLSFor.xlsx` | The source XLSForm (reference only) |

---

## 1. Expose your Google Sheet as CSV

Pick **one** option and set `SHEET_CSV_URL` in `config.js` accordingly.

### Option A — Publish to web (recommended, most reliable)
1. Open the Google Sheet.
2. **File → Share → Publish to web**.
3. Under *Link*, choose the **sheet/tab** with the data, and format **Comma-separated values (.csv)**.
4. Click **Publish** and copy the URL — it looks like:
   `https://docs.google.com/spreadsheets/d/e/<LONG_ID>/pub?gid=0&single=true&output=csv`
5. In `config.js`, set:
   ```js
   const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/<LONG_ID>/pub?gid=0&single=true&output=csv";
   ```

### Option B — Link sharing + gviz (default in `config.js`)
1. **Share → General access → Anyone with the link → Viewer**.
2. That's it — the default `config.js` already builds the gviz CSV URL from the sheet ID
   (`1bYzsn8NxUc1tpyAipQd23uenlgm2CrWD_pG58A-K4Uw`). If your sheet ID or tab (gid) differs, edit
   `SHEET_ID` / `SHEET_GID` at the top of `config.js`.

> Both endpoints send `Access-Control-Allow-Origin: *`, so the page can fetch them from any host.
> The data must be readable without login — a fully private sheet will not load in a static page.

---

## 2. Run locally

A static page using `fetch()` must be served over HTTP (not opened as a `file://` path).

```bash
# from this folder
python -m http.server 8000
# then open http://localhost:8000/
```

Click **↻ Refresh** any time to pull the latest submissions.

---

## 3. Deploy to GitHub Pages

1. Create a GitHub repo and push these files to the **root** (so `index.html` is at the top level):
   ```bash
   git init
   git add index.html app.js styles.css config.js README.md
   git commit -m "MNH QI dashboard"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, select
   **Branch: `main`, Folder: `/ (root)`**, then **Save**.
3. Wait ~1 minute; your dashboard is live at `https://<you>.github.io/<repo>/`.

New KoboToolbox submissions flow into the sheet automatically; visitors see them after a page load or **Refresh**.

---

## Notes & limits
- **No authentication.** The published/shared sheet is publicly readable. Don't publish a sheet that contains data you can't share.
- **Trends** need ≥2 assessments of the *same facility*. Facilities are matched by name (trimmed, case-insensitive), so keep facility names spelled consistently across rounds.
- **Scoring** lives in one place — the `DOMAINS` and `SIGNAL_FUNCTIONS` config at the top of `app.js`. Update there if the tool's thresholds change.
- Interface is English only; the label structure leaves room to add Nepali later.
