const state = loadState();
applySiteName(" — Badge Collection");

const badgeGrid = document.getElementById("badge-grid");
const collectionSummary = document.getElementById("collection-summary");
const lifetimeEpEl = document.getElementById("lifetime-ep");
const streakDisplayEl = document.getElementById("streak-display");
lifetimeEpEl.textContent = formatNumber(state.lifetimeEP);
const streakInfo = streakDisplay(state);
streakDisplayEl.textContent = streakInfo.text;
streakDisplayEl.title = streakInfo.title;

function renderBadgeGrid() {
	badgeGrid.innerHTML = "";
	const discoveredSet = new Set(state.discovered);
	BADGES.forEach(([id, name, emoji, ep, description]) => {
		const rarity = rarityFromEp(ep);
		const unlocked = discoveredSet.has(id);
		const cell = document.createElement("div");
		cell.className = `badge-cell rarity-${rarity} ${unlocked ? "unlocked" : "locked"}`;
		cell.title = unlocked ? `${description} (+${formatNumber(ep)} EP)` : "Not yet discovered";
		cell.innerHTML = `<div class="badge-name">${unlocked ? `${emoji} ${name}` : "???"}</div><div class="badge-ep">+${formatNumber(ep)} EP</div>`;
		badgeGrid.appendChild(cell);
	});
	collectionSummary.textContent = `${discoveredSet.size} / ${BADGES.length} discovered`;
}

renderBadgeGrid();
