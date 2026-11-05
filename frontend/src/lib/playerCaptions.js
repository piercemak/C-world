import Hls from 'hls.js';

// Prefer the explicitly attached sidecar, never the incidental first text track.
// Native/HLS rendering is used only for external playback; local rendering has
// one hidden source whose cues are drawn by our styled caption component.
export function bindPlayerCaptions(video, { sidecar, enabled, onCues, onAvailable }) {
  const list = video.textTracks;
  const hls = video.__cworldHls;
  const observed = new Set();
  let chosen = null, disposed = false, queued = false, reconciling = false;
  const captionTracks = () => Array.from(list).filter(t => t.kind === 'subtitles' || t.kind === 'captions');
  const publish = () => {
    if (disposed) return;
    if (!enabled || video.webkitCurrentPlaybackTargetIsWireless || !chosen) { onCues([]); return; }
    const seen = new Set();
    const cues = Array.from(chosen.activeCues || []).map(cue => ({
      text: (typeof cue.getCueAsHTML === 'function' ? cue.getCueAsHTML().textContent : cue.text || '').trim(),
      startTime: Number(cue.startTime || 0), endTime: Number(cue.endTime || 0),
    })).filter(cue => {
      const key = `${cue.startTime}|${cue.endTime}|${cue.text}`;
      if (!cue.text || seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a,b) => a.startTime-b.startTime);
    onCues(cues);
  };
  const reconcile = () => {
    if (disposed || reconciling) return;
    reconciling = true;
    try {
      const tracks = captionTracks();
      tracks.forEach(track => { if(!observed.has(track)){observed.add(track);track.addEventListener('cuechange',publish);} });
      const external = Boolean(video.webkitCurrentPlaybackTargetIsWireless);
      const preferred = sidecar && sidecar.readyState !== 3 ? sidecar.track : null;
      const embedded = tracks.filter(t => t !== sidecar?.track);
      const hlsTracks = hls?.subtitleTracks || [];
      const native = embedded.find(t => /^en(?:-|$)/i.test(t.language)) || embedded[0];
      onAvailable(Boolean(preferred || embedded.length || hlsTracks.length));
      if (hls) {
        // Guard assignments: the setters themselves emit track-change events.
        const display = enabled && external;
        if (hls.subtitleDisplay !== display) hls.subtitleDisplay = display;
        let index = -1;
        if (enabled && (!preferred || external) && hlsTracks.length) {
          const english = hlsTracks.findIndex(t => /^en(?:-|$)/i.test(t.lang || ''));
          index = english >= 0 ? english : 0;
        }
        if (hls.subtitleTrack !== index) hls.subtitleTrack = index;
      }
      chosen = enabled ? (external ? native || preferred : preferred || native) : null;
      tracks.forEach(track => {
        const mode = track === chosen ? (external ? 'showing' : 'hidden') : 'disabled';
        if(track.mode !== mode) track.mode = mode;
      });
      publish();
    } finally { reconciling = false; }
  };
  const schedule = () => {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(() => { queued = false; reconcile(); });
  };
  ['addtrack','removetrack','change'].forEach(event => list.addEventListener(event,schedule));
  ['loadedmetadata','canplay','webkitcurrentplaybacktargetiswirelesschanged'].forEach(event => video.addEventListener(event,schedule));
  ['load','error'].forEach(event => sidecar?.addEventListener(event,schedule));
  [Hls.Events.MANIFEST_PARSED,Hls.Events.SUBTITLE_TRACKS_UPDATED,Hls.Events.SUBTITLE_TRACK_SWITCH].forEach(event=>hls?.on(event,schedule));
  reconcile();
  return () => {
    disposed = true;
    ['addtrack','removetrack','change'].forEach(event => list.removeEventListener(event,schedule));
    ['loadedmetadata','canplay','webkitcurrentplaybacktargetiswirelesschanged'].forEach(event => video.removeEventListener(event,schedule));
    ['load','error'].forEach(event => sidecar?.removeEventListener(event,schedule));
    [Hls.Events.MANIFEST_PARSED,Hls.Events.SUBTITLE_TRACKS_UPDATED,Hls.Events.SUBTITLE_TRACK_SWITCH].forEach(event=>hls?.off(event,schedule));
    observed.forEach(track=>track.removeEventListener('cuechange',publish));
  };
}
