const STORAGE_KEY = "openrngdle_state_v1";

// Applies CONFIG.webpage_name to the page title (with an optional suffix,
// e.g. " — Badge Collection") and the header's #site-title element.
function applySiteName(titleSuffix = "") {
	document.title = `${CONFIG.webpage_name}${titleSuffix}`;
	const el = document.getElementById("site-title");
	if (el) el.textContent = CONFIG.webpage_name;
}

function localDateString(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function todayLocal() {
	return localDateString(new Date());
}

function yesterdayLocal() {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return localDateString(d);
}

function parseLocalDate(dateStr) {
	const [y, m, d] = dateStr.split("-").map(Number);
	return new Date(y, m - 1, d);
}

// Does a streak last touched on `fromDateStr` still reach `toDateStr` without
// a break? True if they're the same day or adjacent days, or if the number of
// days missed in between is within CONFIG.streak_grace_days — a flat
// allowance rather than tying forgiveness to specific weekdays, so it works
// for irregular schedules too, not just a Mon–Fri work week.
function streakReaches(fromDateStr, toDateStr) {
	if (!fromDateStr) return false;
	if (fromDateStr === toDateStr) return true;
	const from = parseLocalDate(fromDateStr);
	const to = parseLocalDate(toDateStr);
	const gapDays = Math.round((to - from) / 86400000);
	if (gapDays < 1) return false;
	const missedDays = gapDays - 1;
	return missedDays <= CONFIG.streak_grace_days;
}

function formatNumber(n) {
	return n.toLocaleString("en-US");
}

// Coerces a parsed (and possibly untrusted, e.g. imported) object into a
// well-shaped state, falling back field-by-field to a blank default rather
// than rejecting the whole thing for one bad or missing field.
function sanitizeState(parsed) {
	return {
		lastRollDate: parsed.lastRollDate || null,
		lastRoll: typeof parsed.lastRoll === "number" ? parsed.lastRoll : null,
		lifetimeEP: typeof parsed.lifetimeEP === "number" ? parsed.lifetimeEP : 0,
		rollCount: typeof parsed.rollCount === "number" ? parsed.rollCount : 0,
		currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
		longestStreak: typeof parsed.longestStreak === "number" ? parsed.longestStreak : 0,
		discovered: Array.isArray(parsed.discovered) ? parsed.discovered : [],
	};
}

function loadState() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) throw new Error("empty");
		return sanitizeState(JSON.parse(raw));
	} catch {
		return sanitizeState({});
	}
}

function saveState(state) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// btoa/atob only handle Latin1, so UTF-8 text (e.g. an emoji slipping into a
// future field) is routed through raw bytes on the way to/from base64.
function base64EncodeUtf8(str) {
	const bytes = new TextEncoder().encode(str);
	let binary = "";
	bytes.forEach((b) => (binary += String.fromCharCode(b)));
	return btoa(binary);
}

function base64DecodeUtf8(str) {
	const bytes = Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

// The .rngdle export format: state JSON, base64-encoded, so it isn't
// casually readable/editable as plain text in a text editor.
function exportStateFile() {
	return base64EncodeUtf8(JSON.stringify(loadState(), null, 2));
}

// Throws if `raw` isn't valid base64 or doesn't decode to parseable JSON;
// otherwise sanitizes and persists it, the same way loadState would treat it
// on next page load.
function importStateFile(raw) {
	const parsed = JSON.parse(base64DecodeUtf8(raw.trim()));
	const state = sanitizeState(parsed);
	saveState(state);
	return state;
}

// A streak survives until you miss a whole (non-forgiven) calendar day: it's
// still "alive" today whether or not you've rolled yet, as long as it hasn't
// broken as of today — see streakReaches above for what counts as a break.
function effectiveStreak(state) {
	return streakReaches(state.lastRollDate, todayLocal()) ? state.currentStreak : 0;
}

function streakDisplay(state) {
	const streak = effectiveStreak(state);
	return {
		text: `🔥 ${streak} day${streak === 1 ? "" : "s"} streak`,
		title: `Longest streak: ${state.longestStreak} day${state.longestStreak === 1 ? "" : "s"}`,
	};
}
