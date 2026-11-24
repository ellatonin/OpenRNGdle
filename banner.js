function escapeHtml(str) {
	return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Supports **bold** markdown syntax in banner_text. Text is HTML-escaped
// first so the config value can't inject arbitrary markup, then just the
// **bold** spans are turned back into real tags.
function renderBannerMarkdown(text) {
	return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// Shows/hides the site-wide banner (gated by CONFIG.enable_banner) and fills
// in its text and colors from CONFIG.
function setupBanner() {
	const banner = document.getElementById("banner");
	if (!banner) return;

	if (!CONFIG.enable_banner || !CONFIG.banner_text) {
		banner.hidden = true;
		return;
	}
	banner.innerHTML = renderBannerMarkdown(CONFIG.banner_text);
	banner.style.backgroundColor = CONFIG.banner_bg_color || "";
	banner.style.color = CONFIG.banner_text_color || "";
	banner.hidden = false;
}

setupBanner();
