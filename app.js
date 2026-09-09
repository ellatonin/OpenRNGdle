let state = loadState();
applySiteName();

const rollBtn = document.getElementById("roll-btn");
const rollHint = document.getElementById("roll-hint");
const cooldownText = document.getElementById("cooldown-text");
const countdownEl = document.getElementById("countdown");
const resultSection = document.getElementById("result-section");
const resultNumber = document.getElementById("result-number");
const rollTierEl = document.getElementById("roll-tier");
const badgesHeader = document.getElementById("badges-header");
const resultBadges = document.getElementById("result-badges");
const resultEp = document.getElementById("result-ep");
const lifetimeEpEl = document.getElementById("lifetime-ep");
const streakDisplayEl = document.getElementById("streak-display");
const shareBtn = document.getElementById("share-btn");
const toastEl = document.getElementById("toast");

function rarityVar(rarity) {
	return `var(--${rarity})`;
}

function formatPct(p) {
	if (p <= 0) return "0";
	if (p < 0.01) return "<0.01";
	if (p < 1) return p.toFixed(2);
	if (p < 10) return p.toFixed(1);
	return Math.round(p).toString();
}

// Below the 50th percentile, "Top 98%" is technically correct but confusing —
// say "Bottom 2%" instead, since that's the same rank read the intuitive way.
function percentileLabel(pct) {
	return pct < 50 ? `Bottom ${formatPct(pct)}%` : `Top ${formatPct(100 - pct)}%`;
}

// Only mythic (top 1%) and trash (bottom 1%) are extreme enough that an exact
// rank out of all 1,000,001 possible rolls is worth showing. Returns null
// otherwise. Shared between the on-page tier display and the share text.
function rollRankText(tier, ep) {
	if (tier !== "mythic" && tier !== "trash") return null;
	const rank = rankOf(ep);
	const rankNum = tier === "mythic" ? rank.fromTop : rank.fromBottom;
	return `Rank #${formatNumber(rankNum)} ${tier === "mythic" ? "best" : "worst"}`;
}

function renderRollTier(ep) {
	const pct = percentileOf(ep);
	const tier = tierFromPercentile(pct);
	const info = ROLL_TIER_INFO[tier];
	const rank = rollRankText(tier, ep);
	rollTierEl.innerHTML = `${info.emoji} ${info.label} · ${percentileLabel(pct).toUpperCase()}`;
	if (rank) {
		const rankLine = document.createElement("div");
		rankLine.className = "roll-rank";
		rankLine.textContent = rank;
		rollTierEl.appendChild(rankLine);
	}
	rollTierEl.style.color = tier === "trash" ? "var(--muted)" : rarityVar(tier);
}

function renderDigitRow(digits, positions) {
	const hit = new Set(positions);
	const row = document.createElement("div");
	row.className = "digit-row";
	[...digits].forEach((digit, i) => {
		const box = document.createElement("span");
		box.className = `digit-box${hit.has(i) ? " hit" : ""}`;
		box.textContent = digit;
		row.appendChild(box);
	});
	return row;
}

function renderBadgeCard(badge, digits) {
	const card = document.createElement("div");
	card.className = "badge-card";

	const head = document.createElement("div");
	head.className = "badge-card-head";

	const title = document.createElement("div");
	title.className = "badge-title";
	const rarityPill = document.createElement("span");
	rarityPill.className = "rarity-pill";
	rarityPill.textContent = badge.rarity;
	rarityPill.style.color = rarityVar(badge.rarity);
	title.innerHTML = `<span>${badge.emoji}</span><span>${badge.name}</span>`;
	title.appendChild(rarityPill);

	const epPill = document.createElement("span");
	epPill.className = "ep-pill";
	epPill.textContent = `+${formatNumber(badge.ep)} EP`;

	head.appendChild(title);
	head.appendChild(epPill);

	const desc = document.createElement("div");
	desc.className = "badge-desc";
	desc.textContent = badge.description;

	const digitRow = renderDigitRow(digits, badge.positions);
	digitRow.querySelectorAll(".digit-box.hit").forEach((box) => {
		box.style.background = rarityVar(badge.rarity);
	});

	card.append(head, desc, digitRow);

	if (badge.children.length) {
		const childList = document.createElement("div");
		childList.className = "badge-children";
		badge.children.forEach((child) => {
			const row = document.createElement("div");
			row.className = "badge-child";
			row.innerHTML = `<span class="connector">└</span><span>${child.emoji}</span><span>${child.name}</span><span class="earned-label">(earned)</span>`;
			childList.appendChild(row);
		});
		card.appendChild(childList);
	}

	return card;
}

const TIER_ORDER = ["common", "uncommon", "rare", "epic", "anomaly", "mythic"];
function tierDelay(rarity) {
	const tier = TIER_ORDER.indexOf(rarity) + 1;
	return 500 + (tier - 1) * 250;
}

let revealTimers = [];
function clearRevealTimers() {
	revealTimers.forEach(clearTimeout);
	revealTimers = [];
}

let rollAnimTimer = null;
function clearRollAnim() {
	if (rollAnimTimer) clearInterval(rollAnimTimer);
	rollAnimTimer = null;
}

const ROLL_FLICKER_MS = 50; // how often spinning digits change
const ROLL_LINGER_MS = 3000; // how long all digits spin freely before any lock in
const ROLL_LOCK_INTERVAL_MS = 1200; // time between each sequential digit lock, once locking starts

function randomDigitChar() {
	return String(Math.floor(Math.random() * 10));
}

// Slot-machine-style reveal: starts at 6 flickering digits (7 for the one
// number that needs it, 1,000,000), lingers spinning freely for a few
// seconds, then locks them in left to right. Digits beyond the real number's
// length don't settle to a value — they just drop out of the row, so a short
// roll visibly shrinks down to size instead of padding with zeros.
function animateRollNumber(n, onComplete) {
	clearRollAnim();
	const target = String(n);
	const slotCount = Math.max(6, target.length);
	const removeCount = slotCount - target.length;
	const slots = Array.from({ length: slotCount }, randomDigitChar);
	let lockedCount = 0;
	let tick = 0;

	resultNumber.classList.add("rolling");

	function render() {
		resultNumber.innerHTML = "";
		const row = document.createElement("div");
		row.className = "roll-digit-row";
		for (let i = 0; i < slotCount; i++) {
			if (i < lockedCount && i < removeCount) continue; // shed for a smaller roll
			const box = document.createElement("span");
			box.className = "roll-digit";
			box.textContent = slots[i];
			row.appendChild(box);
		}
		resultNumber.appendChild(row);
	}

	render();
	rollAnimTimer = setInterval(() => {
		tick++;
		for (let i = lockedCount; i < slotCount; i++) slots[i] = randomDigitChar();

		const elapsedSinceLinger = tick * ROLL_FLICKER_MS - ROLL_LINGER_MS;
		if (elapsedSinceLinger > 0) {
			const dueCount = Math.min(slotCount, Math.floor(elapsedSinceLinger / ROLL_LOCK_INTERVAL_MS) + 1);
			while (lockedCount < dueCount) {
				if (lockedCount >= removeCount) slots[lockedCount] = target[lockedCount - removeCount];
				lockedCount++;
			}
		}

		render();
		if (lockedCount >= slotCount) {
			clearRollAnim();
			resultNumber.classList.remove("rolling");
			resultNumber.textContent = formatNumber(n);
			onComplete();
		}
	}, ROLL_FLICKER_MS);
}

function revealBadges(evalResult, baselineLifetimeEP) {
	clearRevealTimers();
	// Cards are only added to the DOM as they're revealed, so the box actually
	// grows over time instead of reserving its final height up front. Reveal
	// smallest-EP-first, each one prepended above the rest, so bigger badges
	// land on top. The wait before each reveal scales with that badge's own
	// rarity tier (0.5s for common, 1s for uncommon, ... 3s for mythic), so the
	// pacing itself builds suspense toward the rarest, headline badge on top.
	const revealOrder = [...evalResult.badges].reverse();
	let delay = 0;
	let revealedCount = 0;
	let revealedEp = 0;
	revealOrder.forEach((badge) => {
		const timer = setTimeout(() => {
			resultBadges.prepend(renderBadgeCard(badge, evalResult.digits));
			revealedCount += 1 + badge.children.length;
			revealedEp += badge.ep + badge.children.reduce((sum, child) => sum + child.ep, 0);
			badgesHeader.textContent = `${revealedCount} badge${revealedCount === 1 ? "" : "s"} earned`;
			resultEp.textContent = `+${formatNumber(revealedEp)} EP`;
			lifetimeEpEl.textContent = formatNumber(baselineLifetimeEP + revealedEp);
		}, delay);
		revealTimers.push(timer);
		delay += tierDelay(badge.rarity);
	});
}

// Show every badge at once, in its final resting order (highest EP on top) —
// no stagger, no digit spin. Used to restore an already-rolled result.
function renderResultInstant(evalResult) {
	resultNumber.classList.remove("rolling");
	resultNumber.textContent = formatNumber(evalResult.n);
	renderRollTier(evalResult.ep);
	badgesHeader.textContent = `${evalResult.count} badge${evalResult.count === 1 ? "" : "s"} earned`;
	resultEp.textContent = `+${formatNumber(evalResult.ep)} EP`;
	evalResult.badges.forEach((badge) => {
		resultBadges.appendChild(renderBadgeCard(badge, evalResult.digits));
	});
}

function renderResult(evalResult, { animate = true } = {}) {
	clearRevealTimers();
	clearRollAnim();
	resultBadges.innerHTML = "";
	resultSection.hidden = false;

	if (!animate) {
		lifetimeEpEl.textContent = formatNumber(state.lifetimeEP);
		renderResultInstant(evalResult);
		return;
	}

	// state.lifetimeEP already has this roll's EP folded in (doRoll saves it
	// right away, before the reveal animation, so nothing is lost if the tab
	// closes mid-animation) — so the pre-roll baseline is just the total minus
	// this roll's EP. The display starts there and ticks up as badges reveal.
	const baselineLifetimeEP = state.lifetimeEP - evalResult.ep;
	lifetimeEpEl.textContent = formatNumber(baselineLifetimeEP);
	rollTierEl.textContent = "";
	badgesHeader.textContent = "0 badges earned";
	resultEp.textContent = "+0 EP";
	animateRollNumber(evalResult.n, () => {
		renderRollTier(evalResult.ep);
		revealBadges(evalResult, baselineLifetimeEP);
	});
}

function flattenBadges(evalResult) {
	return evalResult.badges.flatMap((b) => [b, ...b.children]);
}

function hasRolledToday() {
	return state.lastRollDate === todayLocal();
}

function renderStreak() {
	const d = streakDisplay(state);
	streakDisplayEl.textContent = d.text;
	streakDisplayEl.title = d.title;
}

function updateGateUI() {
	const onCooldown = hasRolledToday();
	rollBtn.hidden = onCooldown;
	rollHint.hidden = onCooldown;
	cooldownText.hidden = !onCooldown;
}

function updateCountdown() {
	if (!hasRolledToday()) {
		updateGateUI(); // the local date rolled over — unlock immediately
		renderStreak(); // ...and if a whole day was skipped, the streak has lapsed
		return;
	}
	const now = new Date();
	const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
	const ms = Math.max(0, nextMidnight - now);
	const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
	const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
	const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
	countdownEl.textContent = `${h}:${m}:${s}`;
}

function doRoll() {
	if (hasRolledToday()) return;

	const n = Math.floor(Math.random() * 1000001);
	const evalResult = evaluateRoll(n);

	// A streak extends only if it still reaches today without a break —
	// otherwise today starts a fresh streak of 1.
	state.currentStreak = streakReaches(state.lastRollDate, todayLocal()) ? state.currentStreak + 1 : 1;
	state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
	state.lastRollDate = todayLocal();
	state.lastRoll = n;
	state.lifetimeEP += evalResult.ep;
	state.rollCount += 1;
	const discoveredSet = new Set(state.discovered);
	flattenBadges(evalResult).forEach((b) => discoveredSet.add(b.id));
	state.discovered = [...discoveredSet];
	saveState(state);

	renderResult(evalResult);
	updateGateUI();
	renderStreak();
}

function buildShareText() {
	const result = evaluateRoll(state.lastRoll);
	const pct = percentileOf(result.ep);
	const tier = tierFromPercentile(pct);
	const tierPct = percentileLabel(pct);

	const topBadges = result.badges.slice(0, 3);
	const badgeLines = topBadges.map((b) => `${ROLL_TIER_INFO[b.rarity].emoji} ${b.emoji} ${b.name}`);
	const remaining = result.count - topBadges.length;

	const rank = rollRankText(tier, result.ep);

	const lines = [
		`${CONFIG.webpage_name} 🎲 ${result.n}`,
		"",
		`${ROLL_TIER_INFO[tier].emoji} ${tier.toUpperCase()} • ${tierPct}`,
	];
	if (rank) lines.push(rank);
	lines.push("", ...badgeLines);
	if (remaining > 0) lines.push(`+${remaining} more`);
	lines.push("", `${formatNumber(result.ep)} EP`);

	return lines.join("\n");
}

function showToast(msg) {
	toastEl.textContent = msg;
	toastEl.hidden = false;
	clearTimeout(showToast._t);
	showToast._t = setTimeout(() => {
		toastEl.hidden = true;
	}, 2000);
}

async function onShare() {
	const text = buildShareText();
	try {
		await navigator.clipboard.writeText(text);
		showToast("Copied to clipboard!");
	} catch {
		window.prompt("Copy your result:", text);
	}
}

function restoreLastRoll() {
	lifetimeEpEl.textContent = formatNumber(state.lifetimeEP);
	if (state.lastRoll !== null && hasRolledToday()) {
		renderResult(evaluateRoll(state.lastRoll), { animate: false });
	}
	updateGateUI();
	renderStreak();
}

rollBtn.addEventListener("click", doRoll);
shareBtn.addEventListener("click", onShare);

restoreLastRoll();
updateCountdown();
setInterval(updateCountdown, 1000);
