import { OFFLINE_IMAGE_ASSETS } from "../generated/offlineAssetManifest.js";

const SERVICE_WORKER_PATH = "/sw.js";
const WARM_BATCH_SIZE = 12;

const canUseOfflineCache = () => (
  typeof window !== "undefined"
  && window.location.protocol !== "file:"
  && "serviceWorker" in navigator
);

const runWhenIdle = (callback) => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 4000 });
    return;
  }

  window.setTimeout(callback, 1500);
};

const postWarmBatch = (worker, urls) => {
  if (!worker || urls.length === 0) return;

  worker.postMessage({
    type: "CWORLD_WARM_OFFLINE_ASSETS",
    urls,
  });
};

export const registerOfflineCache = async () => {
  if (!canUseOfflineCache()) return;

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
    const readyRegistration = await navigator.serviceWorker.ready;
    const worker = readyRegistration.active || registration.active || registration.waiting || registration.installing;

    runWhenIdle(() => {
      for (let index = 0; index < OFFLINE_IMAGE_ASSETS.length; index += WARM_BATCH_SIZE) {
        const batch = OFFLINE_IMAGE_ASSETS.slice(index, index + WARM_BATCH_SIZE);
        window.setTimeout(() => postWarmBatch(worker, batch), index * 75);
      }
    });
  } catch (err) {
    console.warn("Offline cache registration failed:", err);
  }
};
