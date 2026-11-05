import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SHOWS } from './mobileshowsData.js';
import registry from '../data/mediaRegistry.json';
import { continueWatchingEntries } from '../lib/watchSync.js';
import './desktopLibraryViews.css';

const normalize = value => String(value || '').replace(/-/g, '').toLowerCase();
const date = value => { const [m,d,y] = String(value).split('-').map(Number); return new Date(y < 100 ? 2000+y : y, m-1,d).getTime() || 0; };
export function ArtworkToggle({ active, onClick }) {
  return <button className="desktop-view-toggle" aria-label={active ? 'Show card images' : 'Show mobile logos'} title={active ? 'Show card images' : 'Show mobile logos'} aria-pressed={active} onClick={onClick}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{active ? <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></> : <><rect x="5" y="3" width="12" height="18" rx="3"/><path d="M20 7v11a3 3 0 0 1-3 3"/></>}</svg></button>;
}
function Art({ src, candidates = [], title }) {
  const [index,setIndex] = useState(0);
  const urls = [...new Set([src,...candidates,'/images/misc/placeholder.png'].filter(Boolean))];
  return <img src={urls[Math.min(index,urls.length-1)]} alt={title} loading="lazy" decoding="async" onError={() => setIndex(i => Math.min(i+1,urls.length-1))}/>;
}
export function RecentLauncher({ items, onClick, compact = false }) {
  const count = Math.min(items.length, 10);
  return <button type="button" className={`desktop-launcher-button${compact ? ' desktop-launcher-compact' : ''}`} onClick={onClick} aria-label="Open Recently Watched" title="Open Recently Watched">
    <span className="desktop-launcher-art" aria-hidden="true">
      {items.slice(0,3).map((item,index) => <span className="desktop-launcher-card" key={item.key} style={{'--side': compact ? index-1 : index === 0 ? 0 : index === 1 ? -1 : 1, zIndex: compact ? index===1 ? 3 : index : index===0 ? 3 : 3-index}}>
        <Art key={item.img} src={item.img} candidates={item.imgCandidates} title=""/>
      </span>)}
      {!count && <svg className="desktop-launcher-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 10a9 9 0 1 1 1 8M3 4v6h6m3-4v6l4 2"/></svg>}
    </span>
    <span className="desktop-launcher-copy"><span className="desktop-launcher-label">Recently Watched <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m4 2 4 4-4 4"/></svg></span><small>{count ? `${count} ${count===1?'title':'titles'} to continue` : 'Explore recently watched'}</small></span>
  </button>;
}
export function MobileLogoLibrary() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [filter,setFilter] = useState('All');
  const [sort,setSort] = useState('Newest');
  const [revision,setRevision] = useState(0);
  useEffect(() => { const update = () => setRevision(x=>x+1); window.addEventListener('watchprogress:update',update); return () => window.removeEventListener('watchprogress:update',update); }, []);
  const progressing = new Set(continueWatchingEntries().map(x => normalize(x.showId)));
  const watched = new Set(progressing);
  for (const key of Object.keys(localStorage).filter(k=>k.startsWith('watchProgress-'))) {
    try { const p=JSON.parse(localStorage.getItem(key)); if(Number(p.t ?? p.currentTime)>5) watched.add(normalize(key.slice('watchProgress-'.length).replace(/-S\d+-E\d+$/, ''))); } catch { /* Ignore invalid cached records. */ }
  }
  try { for(const item of JSON.parse(localStorage.getItem('lastWatched') || '[]')) watched.add(normalize(item.showId)); } catch { /* History may not be available yet. */ }
  const items = useMemo(() => SHOWS.filter(m => filter === 'All' || (filter === 'Movies' ? m.type === 'Movies' : filter === 'Shows' ? m.type !== 'Movies' : filter === 'Unwatched' ? !watched.has(normalize(m.id)) : progressing.has(normalize(m.id)))).sort((a,b) => sort === 'A–Z' ? a.title.localeCompare(b.title) : sort === 'Rating' ? Number(b.ratings)-Number(a.ratings) : sort === 'Year' ? Number(registry.media[b.id]?.library.release_year)-Number(registry.media[a.id]?.library.release_year) : date(b.dateadded)-date(a.dateadded)), [filter,sort,revision,[...watched].join('|'),[...progressing].join('|')]);
  const letters = [...new Set(items.map(m => /^[A-Z]/i.test(m.title) ? m.title[0].toUpperCase() : '#'))].sort();
  return <div className="desktop-browse"><div className="desktop-browse-tools"><div className="desktop-filters">{['All','Movies','Shows','Unwatched','In Progress'].map(f => <button key={f} aria-pressed={filter===f} onClick={() => setFilter(f)}>{filter===f && <motion.span layoutId="desktop-browse-filter" transition={{type:'spring',stiffness:380,damping:32}}/>}<span>{f}</span></button>)}</div><span className="desktop-count">{items.length} titles</span><select aria-label="Sort library" value={sort} onChange={e=>setSort(e.target.value)}>{['Newest','A–Z','Rating','Year'].map(s=><option key={s}>{s}</option>)}</select></div><AnimatePresence mode="wait" initial={false}><motion.div key={`${filter}-${sort}`} className="desktop-browse-body" initial={{opacity:0,y:reduce?0:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduce?0:8}} transition={{duration:.22}}><div className="desktop-poster-scroll"><div className="desktop-poster-grid">{items.map((m,i)=><motion.button id={`poster-${m.id}`} key={m.id} className="desktop-poster" initial={{opacity:0,x:reduce?0:32}} animate={{opacity:1,x:0}} transition={{duration:.44,delay:reduce?0:(i%5)*.035,ease:[.16,1,.3,1]}} onClick={()=>navigate(`/video-library/${m.id}${m.type==='Movies'?'?movie=1':''}`)}><div className="desktop-art"><Art src={m.keyart || m.card} title={m.title}/></div><div className="desktop-rating"><b>IMDb</b>{m.ratings || '—'}</div><strong>{m.title}</strong></motion.button>)}</div>{!items.length && <p className="desktop-empty">No matching titles. Choose another filter.</p>}</div>{sort==='A–Z' && <nav className="desktop-alphabet" aria-label="Jump to letter">{letters.map(l=><button key={l} onClick={()=>document.getElementById(`poster-${items.find(m=>(/^[A-Z]/i.test(m.title)?m.title[0].toUpperCase():'#')===l).id}`)?.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})}>{l}</button>)}</nav>}</motion.div></AnimatePresence></div>;
}
function Shelf({ title, items, fresh, onRemove, onAtmosphere, onBack }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(null);
  return (
    <section className="desktop-shelf">
      <div className="desktop-shelf-heading">
        <h2>{title}</h2>
        {onBack && <button className="desktop-back" aria-label="Back to library" title="Back to library" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m14 6-6 6 6 6"/></svg>
        </button>}
      </div>
      {items.length === 0 && <p className="desktop-empty">Your unfinished movies and episodes will appear here.</p>}
      <div className="desktop-shelf-scroll">
        <div className="desktop-shelf-track">
          <AnimatePresence>
            {items.map((item, i) => {
              const id = item.key || item.showSlug;
              const name = item.title || item.showTitle;
              const image = item.img || item.placeholder;
              const media = registry.media[item.showSlug];
              const episodeName = media?.episodeMetadata?.[String(item.season)]?.[Number(item.episode)-1]?.title || item.episodeTitle || (item.subtitle?.includes(' — ') ? item.subtitle.split(' — ').slice(1).join(' — ') : null);
              const code = item.season ? `S${String(item.season).padStart(2, '0')}E${String(item.episode).padStart(2, '0')}` : 'Movie';
              const caption = item.season ? [`Episode ${item.episode}`, item.runtime].filter(Boolean).join(' · ') : ['Movie', media?.library.duration].filter(Boolean).join(' · ');
              const activate = () => { setHover(id); onAtmosphere(image); };
              const clear = () => { setHover(null); onAtmosphere(null); };
              return <motion.article key={id} className="desktop-tile" layout
                initial={{ opacity: 0, x: reduce ? 0 : 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: .94 }}
                transition={{ duration: .44, delay: reduce ? 0 : i * .065, ease: [.16, 1, .3, 1] }}
                onMouseEnter={activate} onMouseLeave={clear} onFocus={activate}
                onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) clear(); }}>
                <button className="desktop-tile-open" onClick={() => navigate(item.to)}>
                  <span className="desktop-tile-image">
                    <Art key={image} src={image} candidates={item.imgCandidates} title={name}/>
                    <span className="desktop-tile-shade"/>
                    <span className="desktop-tile-badge">{fresh ? <>New <i/></> : code}</span>
                    {!fresh && item.progress > 0 && <span className="desktop-tile-progress"><span style={{ width: `${Math.min(1, item.progress)*100}%` }}/></span>}
                  </span>
                  <span className="desktop-tile-caption"><strong>{episodeName || name}</strong><small>{caption}</small></span>
                </button>
                {onRemove && <button className="desktop-remove" aria-label={`Remove ${name} from Continue Watching`} onClick={() => onRemove(item)}>×</button>}
              </motion.article>;
            })}
          </AnimatePresence>
        </div>
      </div>
      <div className="desktop-shelf-dots" aria-hidden="true">{items.map(item => <span key={item.key || item.showSlug}
        className={hover === (item.key || item.showSlug) ? 'active' : ''}
        style={{ backgroundImage: hover === (item.key || item.showSlug) ? `url("${item.img || item.placeholder}")` : undefined }}/>)}</div>
    </section>
  );
}
export function DesktopRecent({ items, additions, onRemove, onBack, onAtmosphere }) {
  const seen = new Set();
  const fresh = additions.filter(x => !seen.has(x.showSlug) && seen.add(x.showSlug)).slice(0,10);
  useEffect(() => () => onAtmosphere(null), [onAtmosphere]);
  return <div className="desktop-recent">
    <Shelf title="Continue Watching" items={items} onRemove={onRemove} onBack={onBack} onAtmosphere={onAtmosphere}/>
    <Shelf title="New on SeedSpace" items={fresh} fresh onAtmosphere={onAtmosphere}/>
  </div>;
}
