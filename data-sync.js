(() => {
  const syncKeys = [
    "dongteukDrivers",
    "dongteukVehicles",
    "dongteukClients",
    "dongteukNotices",
    "dongteukDispatches",
    "dongteukDispatchMeta",
    "dongteukOffByDate",
    "dongteukMiscByDate",
    "dongteukWork",
    "dongteukWorkReports",
    "dongteukWorkData",
    "dongteukMealClaimRequests",
    "dongteukMealClaimStatus",
    "dongteukMealImages",
    "dongteukMealClaimImages",
    "dongteukPaystubs",
    "dongteukSignatureImages"
  ];

  const syncSet = new Set(syncKeys);
  const pending = new Map();
  let flushTimer = null;

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      const entries = Array.from(pending.entries());
      pending.clear();
      await Promise.all(
        entries.map(([key, value]) =>
          fetch(`/api/data/${encodeURIComponent(key)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value }),
            credentials: "include"
          }).catch(() => null)
        )
      );
    }, 400);
  };

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    originalSetItem(key, value);
    if (syncSet.has(key)) {
      pending.set(key, String(value));
      scheduleFlush();
    }
  };

  const loadSession = async () => {
    try {
      const response = await fetch("/api/session", { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.user?.username) {
        localStorage.setItem("dongteukCurrentUser", data.user.username);
        if (data.user?.role) {
          localStorage.setItem("dongteukCurrentRole", data.user.role);
        }
      }
    } catch (error) {
    }
  };

  const ensureSession = async () => {
    try {
      const response = await fetch("/api/session", { credentials: "include" });
      if (!response.ok) {
        window.location.replace("/main.html");
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!data?.ok) {
        window.location.replace("/main.html");
      }
    } catch (error) {
      window.location.replace("/main.html");
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/data?keys=${encodeURIComponent(syncKeys.join(","))}`, {
        credentials: "include"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.data) return false;
      let changed = false;
      Object.entries(data.data).forEach(([key, value]) => {
        if (typeof value !== "string") return;
        if (localStorage.getItem(key) !== value) {
          originalSetItem(key, value);
          changed = true;
        }
      });
      return changed;
    } catch (error) {
      return false;
    }
  };

  const run = async () => {
    await loadSession();
    const changed = await fetchData();
    const reloadKey = "dongteukDataSyncReloaded";
    if (changed && !sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, "1");
      location.reload();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      ensureSession().catch(() => {});
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      ensureSession().catch(() => {});
    }
  });
})();
