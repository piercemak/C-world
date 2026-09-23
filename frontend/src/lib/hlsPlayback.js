import Hls from "hls.js";

export const isHlsSource = (url = "") => /\.m3u8(?:[?#]|$)/i.test(url);

export const waitForHlsReady = async (video) => {
  await video?.__cworldHlsReady;
};

const prefersNativeHls = () => {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  // Chrome and Chromium browsers may report partial HLS support while still
  // requiring MediaSource for this kind of alternate-audio playlist.
  return /Safari|iPhone|iPad|iPod/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg/i.test(userAgent);
};

// Keep native HLS on Safari for AirPlay; use MediaSource on other browsers.
export function attachHls(video, url) {
  if (prefersNativeHls() && video.canPlayType("application/vnd.apple.mpegurl")) {
    const ready = new Promise((resolve, reject) => {
      const onReady = () => { video.removeEventListener("error", onError); resolve(); };
      const onError = () => { video.removeEventListener("loadedmetadata", onReady); reject(new Error("Native HLS source failed to load")); };
      video.addEventListener("loadedmetadata", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
    video.__cworldHlsReady = ready;
    video.src = url;
    video.load();
    return () => {
      delete video.__cworldHlsReady;
      video.removeAttribute("src");
      video.load();
    };
  }
  if (!Hls.isSupported()) {
    video.dispatchEvent(new Event("error"));
    return () => {};
  }
  const playlistPolicy = (defaults) => ({
    default: {
      ...defaults.default,
      maxTimeToFirstByteMs: 30000,
      maxLoadTimeMs: 60000,
    },
  });
  const hls = new Hls({
    maxBufferLength: 30,
    manifestLoadPolicy: playlistPolicy(Hls.DefaultConfig.manifestLoadPolicy),
    playlistLoadPolicy: playlistPolicy(Hls.DefaultConfig.playlistLoadPolicy),
  });
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  video.__cworldHlsReady = ready;
  hls.once(Hls.Events.MANIFEST_PARSED, resolveReady);
  hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal) {
      rejectReady(new Error(data.details || "HLS source failed to load"));
      console.error("HLS playback failed", { type: data.type, details: data.details, status: data.response?.code });
      video.dispatchEvent(new Event("error"));
    }
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  return () => {
    delete video.__cworldHlsReady;
    hls.destroy();
  };
}
