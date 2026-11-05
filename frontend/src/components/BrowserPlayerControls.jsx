import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { selectAudioTrack } from '../lib/hlsPlayback.js';
import './browserPlayer.css';

export const captionDefaults = { font: 'Helvetica Neue', size: 30, bold: true, background: 0, color: 'White', shadow: true };
export function captionStyle(settings) {
  return { fontFamily: `"${settings.font}", sans-serif`, fontSize: `${settings.size}px`, fontWeight: settings.bold ? 700 : 400,
    color: settings.color === 'Yellow' ? '#ffe34d' : settings.color === 'Warm White' ? '#fff2d4' : '#fff',
    backgroundColor: `rgba(0,0,0,${settings.background})`, textShadow: settings.shadow ? '2px 2px 4px #000c' : 'none' };
}
const time = s => { const v = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0)); return v >= 3600 ? `${Math.floor(v/3600)}:${String(Math.floor(v/60)%60).padStart(2,'0')}:${String(v%60).padStart(2,'0')}` : `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`; };
function Icon({ name }) {
  const paths = {
    back: <path d="m14 5-7 7 7 7"/>, restart: <><path d="M4 10a8 8 0 1 1 0 5M4 4v6h6"/></>,
    play: <path d="m8 4 12 8-12 8Z" fill="currentColor"/>, pause: <><path d="M7 4v16M17 4v16" strokeWidth="5"/></>,
    previous: <><path d="M5 5v14m14-14L7 12l12 7Z" fill="currentColor"/></>, next: <><path d="M19 5v14M5 5l12 7-12 7Z" fill="currentColor"/></>,
    audio: <path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>,
    captions: <><rect x="2" y="4" width="20" height="15" rx="4"/><path d="M10 9H7v5h3m8-5h-3v5h3"/></>,
    auto: <><circle cx="12" cy="12" r="10"/><path d="m8 8 6 4-6 4Zm8 0v8"/></>,
    airplay: <><path d="M5 17H3V4h18v13h-2M12 14l6 7H6Z"/></>,
    volume: <><path d="M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/></>,
    muted: <><path d="M3 9h4l5-5v16l-5-5H3Zm13 0 6 6m0-6-6 6"/></>,
    fullscreen: <path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>,
    exit: <path d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6"/>,
  };
  if (name === 'rewind' || name === 'forward') return <svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><g transform={name==='forward'?'translate(28 0) scale(-1 1)':undefined}><path d="M6 9a10 10 0 1 1-2 9M6 3v6h6"/></g><text x="14" y="19" textAnchor="middle" fill="currentColor" stroke="none" fontSize="11" fontWeight="600">15</text></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Tool({ label, icon, onClick, active, ...props }) {
  return <button type="button" className={`browser-player-tool ${icon==='play'||icon==='pause'?'browser-player-play':''}`}  title={label} aria-label={label} aria-pressed={active} onClick={onClick} {...props}><Icon name={icon}/></button>;
}
function Timeline({ videoRef, src, getPreviewFrame, onBusy }) {
  const [position,setPosition] = useState(0), [duration,setDuration] = useState(0);
  const [hover,setHover] = useState(null), [preview,setPreview] = useState(null);
  const dragging = useRef(false), draft = useRef(0);
  useEffect(() => {
    const video = videoRef.current;
    const sync = () => { if (!dragging.current) setPosition(video.currentTime || 0); setDuration(Number.isFinite(video.duration) ? video.duration : 0); };
    sync();
    ['timeupdate','durationchange','loadedmetadata'].forEach(e=>video.addEventListener(e,sync));
    return () => ['timeupdate','durationchange','loadedmetadata'].forEach(e=>video.removeEventListener(e,sync));
  }, [videoRef,src]);
  const bucket = hover ? Math.floor(hover.time/5)*5 : null;
  useEffect(() => {
    let cancelled=false;
    setPreview(null);
    if(bucket===null) return;
    const timer=setTimeout(async()=>{ try { const image=await getPreviewFrame(bucket); if(!cancelled) setPreview(image); } catch { /* Timestamp remains available. */ } },100);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[bucket,getPreviewFrame,src]);
  const commit = () => { if(dragging.current && videoRef.current) videoRef.current.currentTime=draft.current; dragging.current=false; onBusy(false); };
  return <div className="browser-player-timeline">
    <div className="browser-player-scrub" onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect(); const fraction=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));setHover({time:fraction*duration,x:fraction*100});}} onPointerLeave={()=>setHover(null)}>
      <input aria-label="Playback position" aria-valuetext={`${time(position)} of ${time(duration)}`} type="range" min="0" max={duration || 1} step="0.1" value={position} disabled={!duration}
        style={{'--played':`${duration ? Math.min(100,position/duration*100):0}%`}}
        onPointerDown={e=>{dragging.current=true;draft.current=position;e.currentTarget.setPointerCapture(e.pointerId);onBusy(true);}}
        onPointerUp={commit} onPointerCancel={()=>{dragging.current=false;onBusy(false);}}
        onChange={e=>{const value=Number(e.target.value);draft.current=value;setPosition(value);if(!dragging.current)videoRef.current.currentTime=value;}}/>
      {hover && duration>0 && <div className="browser-player-preview" style={{left:`clamp(96px, ${hover.x}%, calc(100% - 96px))`}}>{preview && <img src={preview} alt=""/>}<span>{time(hover.time)}</span></div>}
    </div>
    <div className="browser-player-times"><span>{time(position)}</span><span>{time(duration)}</span></div>
  </div>;
}
export default function BrowserPlayerControls({ videoRef, src, title, episodeLabel, onClose, restart, isPlaying, toggle, seek, previous, next, volume, muted, setVolume, toggleMute, tracks, selectedTrack, setSelectedTrack, hasSubtitles, subtitlesEnabled, setSubtitlesEnabled, settings, setSettings, autoSkipOutro, setAutoSkipOutro, fullscreen, toggleFullscreen, getPreviewFrame, onBusy }) {
  const [menu,setMenu]=useState(null);
  const root=useRef(null), menuRef=useRef(null), triggerRef=useRef(null);
  useEffect(()=>{setMenu(null);},[src]);
  const airplay=typeof videoRef.current?.webkitShowPlaybackTargetPicker === 'function';
  useEffect(()=>{onBusy(Boolean(menu));return()=>onBusy(false);},[menu,onBusy]);
  useEffect(()=>{
    if(!menu)return;
    menuRef.current?.querySelector('button,input,select')?.focus();
    const outside=e=>{if(!root.current?.contains(e.target))setMenu(null);};
    const escape=e=>{if(e.key==='Escape'){e.stopPropagation();setMenu(null);triggerRef.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};
  },[menu]);
  const open=(name,e)=>{triggerRef.current=e.currentTarget;setMenu(value=>value===name?null:name);};
  const change=(name,value)=>setSettings(current=>({...current,[name]:value}));
  return <>
    <div className="browser-player-heading">
      {onClose && <Tool label="Back to details" icon="back" onClick={onClose}/>}
      <div className="browser-player-title elms-font"><strong>{title}</strong>{episodeLabel && <span>{episodeLabel}</span>}</div>
    </div>
    <div className="browser-player-bottom" ref={root}>
      <Timeline videoRef={videoRef} src={src} getPreviewFrame={getPreviewFrame} onBusy={onBusy}/>
      <div className="browser-player-toolbar">
        <div className="browser-player-leading"><Tool label="Restart from beginning" icon="restart" onClick={restart}/></div>
        <div className="browser-player-transport">
          {previous && <Tool label="Previous episode" icon="previous" onClick={previous}/>}
          <Tool label="Back 15 seconds · ←" icon="rewind" onClick={()=>seek(-15)}/>
          <Tool label={isPlaying?'Pause · Space':'Play · Space'} icon={isPlaying?'pause':'play'} onClick={toggle}/>
          <Tool label="Forward 15 seconds · →" icon="forward" onClick={()=>seek(15)}/>
          {next && <Tool label="Next episode" icon="next" onClick={next}/>}
        </div>
        <div className="browser-player-options">
          {hasSubtitles && <Tool label="Subtitle settings" icon="captions" active={subtitlesEnabled} aria-expanded={menu==='captions'} aria-haspopup="dialog" onClick={e=>open('captions',e)}/>}
          {tracks.length>0 && <Tool label="Audio tracks" icon="audio" aria-expanded={menu==='audio'} aria-haspopup="dialog" onClick={e=>open('audio',e)}/>}
          {next && <Tool label={`Auto-skip outro: ${autoSkipOutro?'On':'Off'}`} icon="auto" active={autoSkipOutro} onClick={()=>setAutoSkipOutro(v=>!v)}/>}
          {airplay && <Tool label="AirPlay" icon="airplay" onClick={()=>videoRef.current.webkitShowPlaybackTargetPicker()}/>}
          <div className="browser-player-volume"><Tool label={muted?'Unmute':'Mute'} icon={muted?'muted':'volume'} onClick={toggleMute}/><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={muted?0:volume} onChange={e=>setVolume(Number(e.target.value))}/></div>
          <Tool label={fullscreen?'Exit fullscreen':'Fullscreen'} icon={fullscreen?'exit':'fullscreen'} onClick={toggleFullscreen}/>
        </div>
      </div>
      <AnimatePresence>{menu && <motion.div key={menu} ref={menuRef} role="dialog" aria-label={menu==='audio'?'Audio tracks':'Subtitle settings'} className="browser-player-popover" initial={{opacity:0,y:10,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:.97}} transition={{duration:.18}}>
        <div className="browser-player-popover-heading"><strong>{menu==='audio'?'Audio':'Subtitles'}</strong><button aria-label="Close settings" onClick={()=>{setMenu(null);triggerRef.current?.focus();}}>×</button></div>
        {menu==='audio' ? tracks.map(track=><button key={track.index} className="browser-player-track" aria-pressed={selectedTrack===track.index} onClick={()=>{if(selectAudioTrack(videoRef.current,track.index)){setSelectedTrack(track.index);setMenu(null);triggerRef.current?.focus();}}}>{track.name}<span>{selectedTrack===track.index?'✓':''}</span></button>) : <>
          <label>Show subtitles<input type="checkbox" checked={subtitlesEnabled} onChange={e=>setSubtitlesEnabled(e.target.checked)}/></label>
          <div className="browser-player-caption-preview"><span style={captionStyle(settings)}>Your subtitle preview</span></div>
          <label>Font<select value={settings.font} onChange={e=>change('font',e.target.value)}>{['Helvetica Neue','Arial','Avenir Next','Georgia','Menlo'].map(font=><option key={font}>{font}</option>)}</select></label>
          <label>Size<input type="range" min="18" max="48" step="2" value={settings.size} onChange={e=>change('size',Number(e.target.value))}/><span>{settings.size}</span></label>
          <label>Text color<select value={settings.color} onChange={e=>change('color',e.target.value)}>{['White','Warm White','Yellow'].map(color=><option key={color}>{color}</option>)}</select></label>
          <label>Bold<input type="checkbox" checked={settings.bold} onChange={e=>change('bold',e.target.checked)}/></label>
          <label>Text shadow<input type="checkbox" checked={settings.shadow} onChange={e=>change('shadow',e.target.checked)}/></label>
          <label>Background<input type="range" min="0" max="0.85" step="0.05" value={settings.background} onChange={e=>change('background',Number(e.target.value))}/><span>{Math.round(settings.background*100)}%</span></label>
          <button className="browser-player-reset" onClick={()=>setSettings(captionDefaults)}>Restore defaults</button>
        </>}
      </motion.div>}</AnimatePresence>
    </div>
  </>;
}
