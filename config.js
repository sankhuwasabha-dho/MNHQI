/* =============================================================================
 * MNH QI Dashboard — configuration
 * -----------------------------------------------------------------------------
 * SHEET_CSV_URL: where the dashboard pulls live data from.
 *
 * Two ways to expose your Google Sheet as CSV (pick ONE, see README.md):
 *
 *  A) "Publish to web -> CSV"  (recommended, most reliable cross-origin)
 *     File -> Share -> Publish to web -> choose the sheet -> Comma-separated
 *     values (.csv) -> Publish. Paste the URL below. It looks like:
 *     https://docs.google.com/spreadsheets/d/e/<LONG_PUB_ID>/pub?gid=0&single=true&output=csv
 *
 *  B) gviz endpoint  (works if the sheet is shared "Anyone with the link -> Viewer")
 *     Uses the normal sheet ID. This is the default below so the dashboard
 *     works out of the box once link-sharing is on.
 * ===========================================================================*/

const SHEET_ID = "1bYzsn8NxUc1tpyAipQd23uenlgm2CrWD_pG58A-K4Uw";
const SHEET_GID = "0";

// Default: gviz CSV (option B). Replace with your "Publish to web" URL (option A)
// if you prefer — just assign it to SHEET_CSV_URL.
const SHEET_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
