// Wires up the optional Export/Import controls (independently gated by
// CONFIG.enable_export / CONFIG.enable_import) that let a player back up or
// transfer their progress across devices/browsers, since everything lives in
// localStorage.
function setupImportExport() {
	const controls = document.getElementById("data-controls");
	if (!controls) return;

	const exportBtn = document.getElementById("export-btn");
	const importBtn = document.getElementById("import-btn");
	const importInput = document.getElementById("import-input");

	exportBtn.hidden = !CONFIG.enable_export;
	importBtn.hidden = !CONFIG.enable_import;
	controls.hidden = !CONFIG.enable_export && !CONFIG.enable_import;

	exportBtn.addEventListener("click", () => {
		const blob = new Blob([exportStateFile()], { type: "application/octet-stream" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `openrngdle-export-${todayLocal()}.rngdle`;
		link.click();
		URL.revokeObjectURL(url);
	});

	importBtn.addEventListener("click", () => importInput.click());

	importInput.addEventListener("change", () => {
		const file = importInput.files[0];
		importInput.value = "";
		if (!file) return;

		if (!confirm("Importing will overwrite your current progress on this device. Continue?")) return;

		file
			.text()
			.then((raw) => {
				importStateFile(raw);
				window.location.reload();
			})
			.catch(() => alert("That file couldn't be imported — it may not be a valid export."));
	});
}

setupImportExport();
