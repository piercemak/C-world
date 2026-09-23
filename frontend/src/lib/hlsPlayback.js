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
  const hls = new Hls({ maxBufferLength: 30 });
  hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal) video.dispatchEvent(new Event("error"));
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  return () => hls.destroy();
}
