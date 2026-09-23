import Hls from "hls.js";

export const isHlsSource = (url = "") => /\.m3u8(?:[?#]|$)/i.test(url);

// Keep native HLS on Safari for AirPlay; use MediaSource on other browsers.
export function attachHls(video, url) {
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.load();
    return () => { video.removeAttribute("src"); video.load(); };
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
  hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal) {
      console.error("HLS playback failed", { type: data.type, details: data.details, status: data.response?.code });
      video.dispatchEvent(new Event("error"));
    }
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  return () => hls.destroy();
}
