(() => {
  const statusPill = document.getElementById("statusPill");
  const fetchedAt = document.getElementById("fetchedAt");
  const versionLine = document.getElementById("versionLine");
  const versionSub = document.getElementById("versionSub");

  function setPill(text, state) {
    statusPill.textContent = text;
    statusPill.dataset.state = state;
  }

  async function load() {
    setPill("Loading", "warn");
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const v = String(data.version || "").trim();
      document.body.dataset.version = v === "2" ? "2" : "1";

      versionLine.textContent = v === "2" ? "Version 2" : "Version 1";
      versionSub.textContent =
        v === "2"
          ? "Updated image: warmer accents and different gradient (visible in screenshots)."
          : "Initial image: cool cyan and violet accents.";

      const t = new Date();
      fetchedAt.textContent = t.toLocaleString();
      setPill("Live", "ok");
    } catch (e) {
      versionLine.textContent = "Could not load version";
      versionSub.textContent = String(e && e.message ? e.message : e);
      setPill("Error", "err");
    }
  }

  load();
  setInterval(load, 8000);
})();
