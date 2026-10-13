import Hls from "hls.js";

export const isHlsSource = (url = "") => /\.m3u8(?:[?#]|$)/i.test(url);

export const waitForHlsReady = async (video) => {
  await video?.__cworldHlsReady;
};

const audioTrackSnapshot = (video) => {
  if (Array.isArray(video?.__cworldAudioTracks)) return video.__cworldAudioTracks;

  // Safari exposes native HLS audio tracks through HTMLMediaElement.audioTracks
  // on supported versions. Keep this optional because other browsers do not
  // expose the collection.
  const nativeTracks = video?.audioTracks ? Array.from(video.audioTracks) : [];
  return nativeTracks.map((track, index) => ({
    id: track.id || String(index),
    index,
    name: track.label || track.language || `Audio ${index + 1}`,
    language: track.language || "",
    channels: null,
    selected: Boolean(track.enabled),
  }));
};

export const getAudioTracks = (video) => audioTrackSnapshot(video);

export const selectAudioTrack = (video, trackIndex) => {
  const hls = video?.__cworldHls;
  if (hls) {
    hls.audioTrack = Number(trackIndex);
    return true;
  }

  const nativeTracks = video?.audioTracks ? Array.from(video.audioTracks) : [];
  const selected = nativeTracks[Number(trackIndex)];
  if (!selected) return false;
  nativeTracks.forEach((track) => { track.enabled = false; });
  selected.enabled = true;
  return true;
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
    video.__cworldAudioTracks = [];
    video.src = url;
    video.load();
    return () => {
      delete video.__cworldHlsReady;
      delete video.__cworldAudioTracks;
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
  video.__cworldHls = hls;
  video.__cworldAudioTracks = [];
  const publishAudioTracks = () => {
    video.__cworldAudioTracks = hls.audioTracks.map((track, index) => ({
      id: track.id ?? String(index),
      index,
      name: track.name || track.lang || `Audio ${index + 1}`,
      language: track.lang || "",
      channels: track.channels || null,
      selected: index === hls.audioTrack,
    }));
    video.dispatchEvent(new CustomEvent("cworldaudiotrackschange"));
  };
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  video.__cworldHlsReady = ready;
  hls.once(Hls.Events.MANIFEST_PARSED, resolveReady);
  hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, publishAudioTracks);
  hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, publishAudioTracks);
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
    delete video.__cworldHls;
    delete video.__cworldAudioTracks;
    hls.destroy();
  };
}
