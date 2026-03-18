import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

const UPDATE_CHECK_KEY = "cearaworld-updater-checked";

export default function DesktopUpdater() {
  useEffect(() => {
    let cancelled = false;

    const runUpdateCheck = async () => {
      if (!import.meta.env.PROD || !isTauri()) return;
      if (sessionStorage.getItem(UPDATE_CHECK_KEY)) return;

      sessionStorage.setItem(UPDATE_CHECK_KEY, "true");

      try {
        const update = await check({ timeout: 10000 });
        if (!update || cancelled) return;

        const versionDetails = update.version ? ` (${update.version})` : "";
        const releaseNotes = update.body ? `\n\n${update.body}` : "";
        const shouldInstall = window.confirm(
          `A new CearaWorld update${versionDetails} is available. Install it now?${releaseNotes}`
        );

        if (!shouldInstall || cancelled) return;

        await update.downloadAndInstall();
        if (cancelled) return;

        window.alert("Update installed. CearaWorld will restart now.");
        await relaunch();
      } catch (error) {
        console.error("Desktop updater check failed:", error);
      }
    };

    runUpdateCheck();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
