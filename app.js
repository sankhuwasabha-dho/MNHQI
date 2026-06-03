/* =============================================================================
 * MNH QI Dashboard — application logic
 *  - fetches the live Google Sheet CSV
 *  - recomputes all domain / signal-function scores client-side
 *  - renders 4 views: Portfolio, Scorecard, Trends, Domain & Gap analysis
 * ===========================================================================*/

/* ----------------------------------------------------------------------------
 * 1. SCORING CONFIG  (single source of truth — mirrors the XLSForm formulas)
 * --------------------------------------------------------------------------*/
const qr = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => "q" + (a + i));

const DOMAINS = [
  { id: "d1",  short: "D1 — Management Demand",        q: qr(1, 3),    max: 3,  green: 3,  yellow: 2 },
  { id: "d2",  short: "D2 — Referral",                 q: qr(4, 6),    max: 3,  green: 3,  yellow: 2 },
  { id: "d3",  short: "D3 — Electricity",              q: qr(7, 8),    max: 2,  green: 2,  yellow: 1 },
  { id: "d4",  short: "D4 — Water & Sanitation",       q: qr(9, 12),   max: 4,  green: 4,  yellow: 3 },
  { id: "d5",  short: "D5 — Respect & Dignity",        q: qr(13, 21),  max: 9,  green: 9,  yellow: 5 },
  { id: "d6",  short: "D6 — Management",               q: qr(22, 31),  max: 10, green: 10, yellow: 6 },
  { id: "d7",  short: "D7 — Staff",                    q: qr(32, 36),  max: 5,  green: 5,  yellow: 3 },
  { id: "d8",  short: "D8 — Supplies & Equipment",     q: qr(37, 63),  max: 27, green: 27, yellow: 14 },
  { id: "d9",  short: "D9 — Emergency Medicines",      q: qr(64, 71),  max: 8,  green: 8,  yellow: 5 },
  { id: "d10", short: "D10 — Labour & Delivery",       q: qr(72, 79),  max: 8,  green: 8,  yellow: 5 },
  { id: "d11", short: "D11 — Partograph",              q: qr(80, 82),  max: 3,  green: 3,  yellow: 2 },
  { id: "d12", short: "D12 — Family Planning",         q: qr(83, 84),  max: 2,  green: 2,  yellow: 1 },
  { id: "d13", short: "D13 — Infection Prevention",    q: qr(85, 92),  max: 8,  green: 8,  yellow: 5 },
];

const SIGNAL_FUNCTIONS = [
  { id: "sf1", name: "SF1 — Parenteral Antibiotics",        q: ["q37", "q67", "q68"], max: 3 },
  { id: "sf2", name: "SF2 — Uterotonic Drugs",              q: ["q37", "q65", "q71"], max: 3 },
  { id: "sf3", name: "SF3 — Parenteral Anticonvulsants",    q: ["sf3_syr", "sf3_can", "sf3_flu", "sf3_mg", "sf3_ca"], max: 5 },
  { id: "sf4", name: "SF4 — Manual Removal of Placenta",    q: ["q34", "q44", "q67", "q69"], max: 4 },
  { id: "sf5", name: "SF5 — Removal of Retained Products",  q: ["q35", "q49", "q64"], max: 3 },
  { id: "sf6", name: "SF6 — Assisted Vaginal Delivery",     q: ["q33", "q50"], max: 2 },
  { id: "sf7", name: "SF7 — Newborn Resuscitation",         q: ["q36", "q52"], max: 2 },
];
const SF_TOTAL_MAX = SIGNAL_FUNCTIONS.reduce((s, f) => s + f.max, 0); // 22
const TOTAL_MAX = DOMAINS.reduce((s, d) => s + d.max, 0);             // 92

const FACILITY_TYPES = { hp: "Health Post", phcc: "PHCC", birthing_centre: "Birthing Centre", hospital: "Hospital" };

// Short labels for every question (used in the gap-analysis view).
const QLABELS = {
  q1:"Maternal services always available", q2:"Beds in first-stage labour room", q3:"Postnatal beds available",
  q4:"Ambulance service available", q5:"Telephone available", q6:"Ambulance arrived in time",
  q7:"Grid/hydro electricity", q8:"Backup electricity (generator/solar)",
  q9:"Clean piped water in labour ward", q10:"Soap at all sinks", q11:"Labour room clean", q12:"Clean drinking water for patients",
  q13:"Maternity ward floor/walls clean", q14:"Delivery room floor/walls clean", q15:"First-stage labour room clean",
  q16:"Mattresses (tanna) on beds", q17:"Privacy curtains/screens", q18:"Bench/seating for patients",
  q19:"Delivery/labour toilet clean & functional", q20:"Soap at patient toilet", q21:"Companion allowed",
  q22:"Job descriptions prepared", q23:"Citizen Charter posted", q24:"Progress report posted",
  q25:"Management committee exists", q26:"Committee meets regularly", q27:"External resource mobilization",
  q28:"Aama Programme info posted", q29:"Social audit conducted", q30:"Action plans after social audit", q31:"50% of action plan completed",
  q32:"Trained SBA each shift", q33:"Staff trained in vacuum delivery", q34:"Staff can perform MRP",
  q35:"Staff can perform MVA", q36:"Staff can perform newborn resuscitation",
  q37:"Syringes & needles", q38:"IV cannulas", q39:"Fetoscope", q40:"Stethoscope", q41:"BP set",
  q42:"Suture chromic catgut", q43:"Surgical sterile gloves", q44:"Elbow gloves", q45:"Dressing materials",
  q46:"Complete delivery set", q47:"Episiotomy pack", q48:"Mayo's trolley", q49:"MVA kit",
  q50:"Manual vacuum extractor", q51:"Cervical tear repair set", q52:"Newborn resuscitation tray",
  q53:"PPIUCD set", q54:"IUCD insertion/removal set", q55:"Implant insertion/removal set", q56:"IUCD",
  q57:"Implants", q58:"Depo Provera", q59:"Chlorhexidine (Navi Malam)", q60:"Chlorine",
  q61:"Baby weighing machine", q62:"Soap for handwashing", q63:"Adult Ambu bag",
  q64:"Severe pre/eclampsia management box", q65:"Oxytocin injection", q66:"Vitamin K",
  q67:"Inj. Ampicillin/Cefazolin", q68:"Inj. Gentamycin", q69:"Inj. Diazepam", q70:"Iron folate + Vitamin", q71:"Shock (PPH) management box",
  q72:"Newborn check within 1 hr", q73:"Mother & newborn kept 24 hrs", q74:"Mother examined (PNC job aid)",
  q75:"Newborn examined (PNC job aid)", q76:"Breastfeeding & immunization info", q77:"Self-care info given",
  q78:"EOC complication flow charts", q79:"Standard protocols & guidelines",
  q80:"Partograph completely filled", q81:"Oxytocin for third stage", q82:"Oxytocin for augmentation",
  q83:"Postpartum FP counselling", q84:"FP method after abortion",
  q85:"Separate sterilization room", q86:"Autoclave functional", q87:"Three-bucket decontamination",
  q88:"Sharps disposal bins", q89:"Safety precaution items", q90:"Waste person uses safety gear",
  q91:"Coloured waste segregation containers", q92:"Waste disposed separately",
};

const PARTC_LABELS = [
  ["c1", "Total deliveries"], ["c2", "C-section deliveries"], ["c3", "Vacuum deliveries"],
  ["c4", "Obstetric complications managed"], ["c5", "Maternal deaths (direct)"],
  ["c6", "Still births (total)"], ["c7", "Fresh still births"], ["c8", "Very early neonatal deaths"],
  ["c9", "Maternal deaths (indirect)"], ["c10", "EOC cases referred out"],
];

/* ----------------------------------------------------------------------------
 * 2. STATE
 * --------------------------------------------------------------------------*/
const STATE = { rows: [], filtered: [], lastUpdated: null };
const charts = {}; // keep refs so we can destroy before re-render

const COLOR = { green: "#1aab57", yellow: "#e0a106", red: "#e23b3b" };

/* ----------------------------------------------------------------------------
 * 3. HELPERS
 * --------------------------------------------------------------------------*/
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

function statusFromPct(pct) { return pct >= 0.85 ? "green" : pct >= 0.6 ? "yellow" : "red"; }
function statusLabel(s) { return s === "green" ? "Good" : s === "yellow" ? "Needs attention" : "Urgent"; }

/* ----------------------------------------------------------------------------
 * 4. COMPUTE — derive all scores for one submission row
 * --------------------------------------------------------------------------*/
function computeRow(r) {
  const domains = DOMAINS.map((d) => {
    const score = d.q.reduce((s, q) => s + num(r[q]), 0);
    const status = score >= d.green ? "green" : score >= d.yellow ? "yellow" : "red";
    return { ...d, score, status, pct: score / d.max };
  });
  const total = domains.reduce((s, d) => s + d.score, 0);
  const totalPct = total / TOTAL_MAX;

  const sfs = SIGNAL_FUNCTIONS.map((f) => {
    const score = f.q.reduce((s, q) => s + num(r[q]), 0);
    return { ...f, score, status: score >= f.max ? "green" : "red" };
  });
  const sfTotal = sfs.reduce((s, f) => s + f.score, 0);

  // GPS: "lat lon alt accuracy"
  let lat = null, lon = null;
  if (hasVal(r.gps)) {
    const p = String(r.gps).trim().split(/\s+/).map(Number);
    if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) { lat = p[0]; lon = p[1]; }
  }

  return {
    raw: r,
    facility_name: (r.facility_name || "").trim(),
    key: norm(r.facility_name),
    district: (r.district || "").trim(),
    palika: (r.palika || "").trim(),
    facility_type: r.facility_type || "",
    facility_type_label: FACILITY_TYPES[r.facility_type] || r.facility_type || "—",
    assessment_no: r.assessment_no || "",
    assessment_date: r.assessment_date || "",
    assessors: [r.assessor_1, r.assessor_2, r.assessor_3].filter(hasVal),
    domains, total, totalPct, status: statusFromPct(totalPct),
    sfs, sfTotal, sfStatus: sfTotal >= SF_TOTAL_MAX ? "green" : sfTotal >= SF_TOTAL_MAX * 0.7 ? "yellow" : "red",
    lat, lon,
  };
}

/* ----------------------------------------------------------------------------
 * 5. FETCH + PARSE
 * --------------------------------------------------------------------------*/
function loadData() {
  setStatus("Loading…");
  showLoading();
  Papa.parse(SHEET_CSV_URL + "&_cb=" + Date.now(), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      try {
        const rows = res.data
          .map(remapRow)
          .filter((r) => hasVal(r.facility_name))
          .map(computeRow);
        STATE.rows = rows;
        STATE.lastUpdated = new Date();
        applyFilters();        // sets STATE.filtered + populates filter dropdowns
        buildFacilityPickers();
        renderCurrentView();
        setStatus(`${rows.length} assessment${rows.length === 1 ? "" : "s"} · updated ${STATE.lastUpdated.toLocaleTimeString()}`);
      } catch (e) {
        showError(e.message || String(e));
      }
    },
    error: (err) => showError("Could not load the Google Sheet CSV. " +
      "Check that the sheet is shared (link-viewer or Published to web) and the URL in config.js is correct. " +
      "Details: " + (err.message || err)),
  });
}

// Strip "group/name" header prefixes -> last segment becomes the field name.
function remapRow(row) {
  const out = {};
  for (const k in row) {
    const key = k.split("/").pop().trim();
    out[key] = row[k];
  }
  return out;
}

/* ----------------------------------------------------------------------------
 * 6. FILTERS  (apply across all views)
 * --------------------------------------------------------------------------*/
function uniqueSorted(arr) { return [...new Set(arr.filter(hasVal))].sort((a, b) => String(a).localeCompare(String(b))); }

function populateFilter(id, values, current) {
  const sel = $("#" + id);
  const prev = current ?? sel.value;
  sel.innerHTML = `<option value="">All</option>` + values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if (prev && values.includes(prev)) sel.value = prev;
}

function initFilters() {
  ["f-district", "f-palika", "f-type", "f-assessment"].forEach((id) =>
    $("#" + id).addEventListener("change", () => { applyFilters(); renderCurrentView(); }));
  $("#f-clear").addEventListener("click", () => {
    ["f-district", "f-palika", "f-type", "f-assessment"].forEach((id) => ($("#" + id).value = ""));
    applyFilters(); renderCurrentView();
  });
}

function applyFilters() {
  // (re)populate dropdown options from full dataset
  populateFilter("f-district", uniqueSorted(STATE.rows.map((r) => r.district)));
  populateFilter("f-palika", uniqueSorted(STATE.rows.map((r) => r.palika)));
  populateFilter("f-type", uniqueSorted(STATE.rows.map((r) => r.facility_type)));
  populateFilter("f-assessment", uniqueSorted(STATE.rows.map((r) => r.assessment_no)));

  const fd = $("#f-district").value, fp = $("#f-palika").value, ft = $("#f-type").value, fa = $("#f-assessment").value;
  STATE.filtered = STATE.rows.filter((r) =>
    (!fd || r.district === fd) && (!fp || r.palika === fp) &&
    (!ft || r.facility_type === ft) && (!fa || r.assessment_no === fa));
}

// type filter shows label not code
function decorateTypeFilter() {
  const sel = $("#f-type");
  $$("option", sel).forEach((o) => { if (o.value) o.textContent = FACILITY_TYPES[o.value] || o.value; });
}

/* ----------------------------------------------------------------------------
 * 7. ROUTER
 * --------------------------------------------------------------------------*/
const VIEWS = ["portfolio", "scorecard", "trends", "service"];
function currentView() { const h = location.hash.replace("#", ""); return VIEWS.includes(h) ? h : "portfolio"; }

function renderCurrentView() {
  const v = currentView();
  $$("nav.tabs a").forEach((a) => a.classList.toggle("active", a.dataset.view === v));
  $$(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + v));
  if (!STATE.rows.length) return;
  decorateTypeFilter();
  ({ portfolio: renderPortfolio, scorecard: renderScorecard, trends: renderTrends, service: renderService }[v])();
}

/* ----------------------------------------------------------------------------
 * 8. VIEW: PORTFOLIO
 * --------------------------------------------------------------------------*/
let sortKey = "total", sortDir = -1;

function renderPortfolio() {
  const rows = STATE.filtered;
  const counts = { green: 0, yellow: 0, red: 0 };
  rows.forEach((r) => counts[r.status]++);
  const facilities = new Set(rows.map((r) => r.key)).size;
  const avgPct = rows.length ? rows.reduce((s, r) => s + r.totalPct, 0) / rows.length : 0;

  $("#kpis").innerHTML = `
    <div class="kpi"><div class="val">${facilities}</div><div class="lbl">Facilities</div></div>
    <div class="kpi"><div class="val">${rows.length}</div><div class="lbl">Assessments</div></div>
    <div class="kpi ${statusFromPct(avgPct)}"><div class="val">${Math.round(avgPct * 100)}%</div><div class="lbl">Avg quality score</div></div>
    <div class="kpi green"><div class="val">${counts.green}</div><div class="lbl">Good (green)</div></div>
    <div class="kpi yellow"><div class="val">${counts.yellow}</div><div class="lbl">Needs attention</div></div>
    <div class="kpi red"><div class="val">${counts.red}</div><div class="lbl">Urgent (red)</div></div>`;

  renderPortfolioTable(rows);
  renderMap(rows);
}

function renderPortfolioTable(rows) {
  const cols = [
    { k: "facility_name", t: "Facility", num: false },
    { k: "district", t: "District", num: false },
    { k: "facility_type_label", t: "Type", num: false },
    { k: "assessment_no", t: "Assess #", num: true },
    { k: "assessment_date", t: "Date", num: false },
    { k: "sfTotal", t: "BEONC /22", num: true },
    { k: "total", t: "Score /92", num: true },
    { k: "totalPct", t: "%", num: true },
    { k: "status", t: "Status", num: false },
  ];
  const sorted = [...rows].sort((a, b) => {
    let x = a[sortKey], y = b[sortKey];
    if (typeof x === "string") { x = x.toLowerCase(); y = (y || "").toLowerCase(); }
    return x < y ? -1 * sortDir : x > y ? 1 * sortDir : 0;
  });

  const head = cols.map((c) =>
    `<th class="sortable ${c.num ? "num" : ""}" data-k="${c.k}">${c.t}${sortKey === c.k ? (sortDir < 0 ? " ▼" : " ▲") : ""}</th>`).join("");
  const body = sorted.map((r, i) => `
    <tr class="clickable" data-idx="${STATE.rows.indexOf(r)}">
      <td>${esc(r.facility_name)}</td>
      <td>${esc(r.district)}</td>
      <td>${esc(r.facility_type_label)}</td>
      <td class="num">${esc(r.assessment_no)}</td>
      <td>${esc(r.assessment_date)}</td>
      <td class="num">${r.sfTotal}</td>
      <td class="num">${r.total}</td>
      <td class="num">${Math.round(r.totalPct * 100)}%</td>
      <td><span class="chip ${r.status}">${statusLabel(r.status)}</span></td>
    </tr>`).join("");

  $("#portfolio-table").innerHTML = rows.length
    ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
    : `<div class="empty">No assessments match the current filters.</div>`;

  $$("#portfolio-table th.sortable").forEach((th) => th.addEventListener("click", () => {
    const k = th.dataset.k;
    if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = (k === "facility_name" || k === "district") ? 1 : -1; }
    renderPortfolioTable(rows);
  }));
  $$("#portfolio-table tr.clickable").forEach((tr) => tr.addEventListener("click", () => {
    openScorecard(parseInt(tr.dataset.idx, 10));
  }));
}

let mapObj = null, mapLayer = null;
function renderMap(rows) {
  const pts = rows.filter((r) => r.lat != null && r.lon != null);
  if (!mapObj) {
    mapObj = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(mapObj);
  }
  if (mapLayer) mapLayer.remove();
  mapLayer = L.layerGroup().addTo(mapObj);
  if (!pts.length) { mapObj.setView([28.3, 84.1], 6); return; } // Nepal center fallback
  pts.forEach((r) => {
    const m = L.circleMarker([r.lat, r.lon], {
      radius: 9, color: "#fff", weight: 2, fillColor: COLOR[r.status], fillOpacity: 0.9,
    });
    m.bindPopup(`<b>${esc(r.facility_name)}</b><br>${esc(r.facility_type_label)} · ${esc(r.district)}<br>
      Score: <b>${r.total}/92</b> (${Math.round(r.totalPct * 100)}%) — ${statusLabel(r.status)}<br>
      BEONC: ${r.sfTotal}/22`);
    mapLayer.addLayer(m);
  });
  mapObj.fitBounds(L.latLngBounds(pts.map((r) => [r.lat, r.lon])).pad(0.3));
  setTimeout(() => mapObj.invalidateSize(), 50);
}

/* ----------------------------------------------------------------------------
 * 9. VIEW: FACILITY SCORECARD
 * --------------------------------------------------------------------------*/
function buildFacilityPickers() {
  // scorecard picker: every assessment row
  const scOpts = STATE.rows.map((r, i) =>
    `<option value="${i}">${esc(r.facility_name)} — Assessment ${esc(r.assessment_no || "?")} (${esc(r.assessment_date || "n/a")})</option>`).join("");
  $("#sc-picker").innerHTML = scOpts || `<option>No data</option>`;

  // trends picker: facilities that appear (ideally with >1 assessment)
  const byKey = groupByFacility(STATE.rows);
  const trOpts = Object.values(byKey).map((g) =>
    `<option value="${esc(g.key)}">${esc(g.name)} (${g.rows.length} assessment${g.rows.length === 1 ? "" : "s"})</option>`).join("");
  $("#tr-picker").innerHTML = trOpts || `<option>No data</option>`;
}

function groupByFacility(rows) {
  const map = {};
  rows.forEach((r) => {
    if (!map[r.key]) map[r.key] = { key: r.key, name: r.facility_name, rows: [] };
    map[r.key].rows.push(r);
  });
  Object.values(map).forEach((g) => g.rows.sort((a, b) => num(a.assessment_no) - num(b.assessment_no)));
  return map;
}

function openScorecard(idx) {
  location.hash = "scorecard";
  $("#sc-picker").value = String(idx);
  renderScorecard();
}

function renderScorecard() {
  if (!STATE.rows.length) return;
  let idx = parseInt($("#sc-picker").value, 10);
  if (!Number.isFinite(idx) || !STATE.rows[idx]) idx = 0;
  const r = STATE.rows[idx];

  // header
  $("#sc-head").innerHTML = `
    <div class="meta">
      <h2>${esc(r.facility_name)}</h2>
      <div class="muted">${esc(r.facility_type_label)} · ${esc(r.district)}${r.palika ? " · " + esc(r.palika) : ""}</div>
      <div class="meta-grid">
        <div><b>Assessment</b><br>${esc(r.assessment_no || "—")}</div>
        <div><b>Date</b><br>${esc(r.assessment_date || "—")}</div>
        <div><b>Assessors</b><br>${r.assessors.length ? r.assessors.map(esc).join("; ") : "—"}</div>
      </div>
    </div>
    <div class="score-badge ${r.status}">
      <div class="big">${r.total}<span style="font-size:1rem">/92</span></div>
      <div class="pct">${Math.round(r.totalPct * 100)}%</div>
      <div class="lbl">${statusLabel(r.status)}</div>
    </div>`;

  // domain bars — colour-coded by traffic-light status (green / yellow / red)
  $("#sc-domains").innerHTML = r.domains.map((d) => `
    <div class="dombar ${d.status}">
      <span>${esc(d.short)}</span>
      <span class="track"><span class="fill ${d.status}" style="width:${Math.round(d.pct * 100)}%"></span></span>
      <span class="sc">${d.score}/${d.max}</span>
      <span class="chip ${d.status}">${statusLabel(d.status)}</span>
    </div>`).join("");

  // radar
  drawChart("scRadar", "radar", {
    labels: r.domains.map((d) => d.short.replace(/^D\d+ — /, "")),
    datasets: [{ label: "Domain %", data: r.domains.map((d) => Math.round(d.pct * 100)),
      fill: true, backgroundColor: "rgba(47,111,208,.18)", borderColor: "#2f6fd0", pointBackgroundColor: "#2f6fd0" }],
  }, { scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { stepSize: 25 } } }, plugins: { legend: { display: false } } });

  // signal functions
  $("#sc-sf").innerHTML = r.sfs.map((f) => `
    <div class="sf-card ${f.status}">
      <div class="name">${esc(f.name)}</div>
      <div class="sc">${f.score}/${f.max} <span class="dot ${f.status}"></span></div>
    </div>`).join("");
  const redCount = r.sfs.filter((f) => f.status === "red").length;
  $("#sc-sf-total").innerHTML =
    `<span class="chip ${r.sfStatus}">BEONC total ${r.sfTotal}/22</span>` +
    (redCount >= 4 ? `<div class="warn">⚠️ ${redCount} of 7 signal functions are RED — this facility cannot currently provide full BEONC emergency obstetric care. Urgent action required.</div>` : "");

  // part C
  $("#sc-partc").innerHTML = PARTC_LABELS.map(([k, label]) => {
    const v = r.raw[k];
    return `<div class="stat"><div class="v">${hasVal(v) ? esc(v) : "—"}</div><div class="k">${label}</div></div>`;
  }).join("");
  const fy = r.raw.fy_month;
  $("#sc-partc-month").textContent = hasVal(fy) ? "Reporting period: " + fy : "";

  // action plan
  const aps = [1, 2, 3, 4, 5].map((n) => ({
    task: r.raw["ap" + n + "_task"], who: r.raw["ap" + n + "_who"], due: r.raw["ap" + n + "_deadline"],
  })).filter((a) => hasVal(a.task));
  $("#sc-actions").innerHTML = aps.length
    ? `<table><thead><tr><th>#</th><th>Action / Activity</th><th>Responsible</th><th>Deadline</th></tr></thead>
       <tbody>${aps.map((a, i) => `<tr><td class="num">${i + 1}</td><td>${esc(a.task)}</td><td>${esc(a.who) || "—"}</td><td>${esc(a.due) || "—"}</td></tr>`).join("")}</tbody></table>`
    : `<div class="empty">No action items recorded.</div>`;
}

/* ----------------------------------------------------------------------------
 * 10. VIEW: TRENDS
 * --------------------------------------------------------------------------*/
function renderTrends() {
  if (!STATE.rows.length) return;
  const byKey = groupByFacility(STATE.rows);
  const key = $("#tr-picker").value || Object.keys(byKey)[0];
  const g = byKey[key];
  if (!g) { $("#tr-body").innerHTML = `<div class="empty">No facility selected.</div>`; return; }

  if (g.rows.length < 2) {
    $("#tr-note").innerHTML = `<div class="note-banner">Only ${g.rows.length} assessment recorded for <b>${esc(g.name)}</b>. ` +
      `The trend view compares the 1st, 2nd and 3rd assessments — it will populate automatically once repeat assessments are submitted.</div>`;
  } else {
    $("#tr-note").innerHTML = "";
  }

  const labels = g.rows.map((r) => `A${r.assessment_no || "?"} · ${r.assessment_date || ""}`);

  // total % line
  drawChart("trTotal", "line", {
    labels,
    datasets: [{ label: "Overall quality %", data: g.rows.map((r) => Math.round(r.totalPct * 100)),
      borderColor: "#15489e", backgroundColor: "rgba(21,72,158,.12)", fill: true, tension: .25,
      pointRadius: 5, pointBackgroundColor: "#15489e" }],
  }, { scales: { y: { suggestedMin: 0, suggestedMax: 100 } }, plugins: { legend: { display: false } } });

  // grouped bar: each domain % per assessment
  drawChart("trDomains", "bar", {
    labels: DOMAINS.map((d) => d.short.replace(/^D(\d+).*/, "D$1")),
    datasets: g.rows.map((r, i) => ({
      label: labels[i],
      data: r.domains.map((d) => Math.round(d.pct * 100)),
      backgroundColor: ["#9db8e8", "#2f6fd0", "#15489e"][i] || "#0c2d63",
    })),
  }, { scales: { y: { suggestedMin: 0, suggestedMax: 100 } } });

  // delta table (vs first assessment)
  const first = g.rows[0], last = g.rows[g.rows.length - 1];
  const deltas = DOMAINS.map((d, i) => {
    const a = first.domains[i].score, b = last.domains[i].score;
    return { name: d.short, from: a, to: b, delta: b - a, max: d.max };
  });
  const totalDelta = last.total - first.total;
  $("#tr-deltas").innerHTML = g.rows.length < 2 ? "" : `
    <h3 class="sub">Change since first assessment</h3>
    <table><thead><tr><th>Domain</th><th class="num">First</th><th class="num">Latest</th><th class="num">Δ</th></tr></thead>
    <tbody>
      ${deltas.map((d) => `<tr><td>${esc(d.name)}</td><td class="num">${d.from}/${d.max}</td><td class="num">${d.to}/${d.max}</td>
        <td class="num" style="color:${d.delta > 0 ? COLOR.green : d.delta < 0 ? COLOR.red : "#888"};font-weight:700">${d.delta > 0 ? "▲ +" + d.delta : d.delta < 0 ? "▼ " + d.delta : "—"}</td></tr>`).join("")}
      <tr style="font-weight:800"><td>TOTAL /92</td><td class="num">${first.total}</td><td class="num">${last.total}</td>
        <td class="num" style="color:${totalDelta > 0 ? COLOR.green : totalDelta < 0 ? COLOR.red : "#888"}">${totalDelta > 0 ? "▲ +" + totalDelta : totalDelta < 0 ? "▼ " + totalDelta : "—"}</td></tr>
    </tbody></table>`;
}

/* ----------------------------------------------------------------------------
 * 11. VIEW: SERVICE DATA & OUTCOMES  (Part C, aggregated over filtered set)
 * --------------------------------------------------------------------------*/
const COMPLICATIONS = [
  ["c4_1", "Antepartum Haemorrhage"], ["c4_2", "Postpartum Haemorrhage"], ["c4_3", "Ectopic Pregnancy"],
  ["c4_4", "Pre-eclampsia / Eclampsia"], ["c4_5", "Rupture Uterus"], ["c4_6", "Postpartum Sepsis"],
  ["c4_7", "Prolonged / Obstructed Labour"], ["c4_8", "Retained Placenta"], ["c4_9", "Abortion Complication"],
];

function sumField(rows, key) { return rows.reduce((s, r) => s + (hasVal(r.raw[key]) ? num(r.raw[key]) : 0), 0); }
function anyField(rows, key) { return rows.some((r) => hasVal(r.raw[key])); }

function renderService() {
  const rows = STATE.filtered;
  // facilities that actually reported any Part C numbers
  const partcKeys = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"];
  const reporting = rows.filter((r) => partcKeys.some((k) => hasVal(r.raw[k])));

  if (!reporting.length) { $("#svc-body").style.display = "none"; $("#svc-empty").style.display = "block"; return; }
  $("#svc-body").style.display = ""; $("#svc-empty").style.display = "none";

  const deliveries = sumField(rows, "c1");
  const csec = sumField(rows, "c2");
  const vacuum = sumField(rows, "c3");
  const normal = Math.max(deliveries - csec - vacuum, 0);
  const complications = sumField(rows, "c4");
  const matDeaths = sumField(rows, "c5") + sumField(rows, "c9");
  const stillbirths = sumField(rows, "c6");
  const referred = sumField(rows, "c10");

  const rate = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 + "%" : "—");

  // KPI cards
  $("#svc-kpis").innerHTML = `
    <div class="kpi"><div class="val">${deliveries}</div><div class="lbl">Total deliveries</div></div>
    <div class="kpi"><div class="val">${rate(csec, deliveries)}</div><div class="lbl">C-section rate</div></div>
    <div class="kpi"><div class="val">${vacuum}</div><div class="lbl">Vacuum deliveries</div></div>
    <div class="kpi"><div class="val">${complications}</div><div class="lbl">Complications managed</div></div>
    <div class="kpi ${matDeaths ? "red" : "green"}"><div class="val">${matDeaths}</div><div class="lbl">Maternal deaths</div></div>
    <div class="kpi ${stillbirths ? "yellow" : "green"}"><div class="val">${stillbirths}</div><div class="lbl">Still births</div></div>
    <div class="kpi"><div class="val">${referred}</div><div class="lbl">EOC referred out</div></div>`;

  // Delivery types doughnut
  drawChart("svcDelivery", "doughnut", {
    labels: ["Normal", "C-section", "Vacuum"],
    datasets: [{ data: [normal, csec, vacuum], backgroundColor: ["#2f6fd0", "#e0a106", "#1aab57"] }],
  }, { plugins: { legend: { position: "bottom" } } });

  // Complications breakdown bar
  const compData = COMPLICATIONS.map(([k, label]) => ({ label, v: sumField(rows, k) }));
  drawChart("svcComplications", "bar", {
    labels: compData.map((c) => c.label),
    datasets: [{ label: "Cases", data: compData.map((c) => c.v), backgroundColor: "#c0556e" }],
  }, { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } });

  // Deliveries by facility
  drawChart("svcByFacility", "bar", {
    labels: reporting.map((r) => `${r.facility_name} (A${r.assessment_no || "?"})`),
    datasets: [
      { label: "Normal", data: reporting.map((r) => Math.max(num(r.raw.c1) - num(r.raw.c2) - num(r.raw.c3), 0)), backgroundColor: "#2f6fd0" },
      { label: "C-section", data: reporting.map((r) => num(r.raw.c2)), backgroundColor: "#e0a106" },
      { label: "Vacuum", data: reporting.map((r) => num(r.raw.c3)), backgroundColor: "#1aab57" },
    ],
  }, { scales: { x: { stacked: true }, y: { stacked: true, ticks: { precision: 0 } } } });

  // Adverse outcomes stat grid
  const outcomes = [
    ["c5", "Maternal deaths (direct)"], ["c9", "Maternal deaths (indirect)"],
    ["c6", "Still births (total)"], ["c7", "Fresh still births"],
    ["c8", "Very early neonatal deaths"], ["c10", "EOC cases referred out"],
  ];
  $("#svc-outcomes").innerHTML = outcomes.map(([k, label]) => {
    const v = sumField(rows, k);
    return `<div class="stat"><div class="v">${anyField(rows, k) ? v : "—"}</div><div class="k">${label}</div></div>`;
  }).join("");

  // Per-facility table
  const tcols = [["c1", "Deliv."], ["c2", "C-sec"], ["c3", "Vacuum"], ["c4", "Compl."],
    ["c5", "Mat.death"], ["c6", "Stillb."], ["c8", "Neo.death"], ["c10", "Referred"]];
  $("#svc-table").innerHTML = `
    <table><thead><tr><th>Facility</th><th>Period</th>${tcols.map((c) => `<th class="num">${c[1]}</th>`).join("")}</tr></thead>
    <tbody>${reporting.map((r) => `
      <tr><td>${esc(r.facility_name)}</td><td>${esc(r.raw.fy_month || "—")}</td>
      ${tcols.map((c) => `<td class="num">${hasVal(r.raw[c[0]]) ? esc(r.raw[c[0]]) : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const skipped = rows.length - reporting.length;
  $("#svc-note").innerHTML = skipped > 0
    ? `<div class="note-banner">${reporting.length} of ${rows.length} selected assessment${rows.length === 1 ? "" : "s"} reported monthly service data; ${skipped} had Part C left blank and are excluded from these totals.</div>`
    : "";
}

/* ----------------------------------------------------------------------------
 * 12. CHART helper (destroy + recreate)
 * --------------------------------------------------------------------------*/
function drawChart(canvasId, type, data, options) {
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[canvasId] = new Chart(ctx, {
    type, data,
    options: Object.assign({ responsive: true, maintainAspectRatio: false }, options || {}),
  });
}

/* ----------------------------------------------------------------------------
 * 13. UI state helpers
 * --------------------------------------------------------------------------*/
function setStatus(t) { $("#status-line").textContent = t; }
function showLoading() {
  $("#kpis").innerHTML = "";
  $("#portfolio-table").innerHTML = `<div class="loading"><div class="spinner"></div>Loading live data from Google Sheets…</div>`;
}
function showError(msg) {
  setStatus("Error");
  $("#portfolio-table").innerHTML = `<div class="error-box"><b>Unable to load data.</b><br>${esc(msg)}</div>`;
}

/* ----------------------------------------------------------------------------
 * 14. BOOT
 * --------------------------------------------------------------------------*/
window.addEventListener("DOMContentLoaded", () => {
  initFilters();
  $("#btn-refresh").addEventListener("click", loadData);
  $("#sc-picker").addEventListener("change", renderScorecard);
  $("#tr-picker").addEventListener("change", renderTrends);
  window.addEventListener("hashchange", renderCurrentView);
  loadData();
});
