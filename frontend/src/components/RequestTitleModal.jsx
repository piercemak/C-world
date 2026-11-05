import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { searchRequestTitles, sendTitleRequest } from '../lib/requestTitles.js';
import './requestTitleModal.css';

function TitleRow({ title, selected = false }) {
  const [failed, setFailed] = useState(false);
  return <>
    <span className="request-title-poster">{title.poster && !failed ? <img src={title.poster} alt="" loading="lazy" onError={() => setFailed(true)}/> : <span aria-hidden="true">▧</span>}</span>
    <span className="request-title-copy"><strong>{title.title}</strong><small>{title.type === 'tv' ? 'Show' : 'Movie'} · {title.year || 'Year unknown'}</small></span>
    <span aria-hidden="true" className="request-title-indicator">{selected ? '✓' : '›'}</span>
  </>;
}
export default function RequestTitleModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [audio, setAudio] = useState('Original audio');
  const [subtitles, setSubtitles] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const panel = useRef(null), input = useRef(null), busy = useRef(false), close = useRef(onClose);
  const mounted = useRef(true);
  const reduce = useReducedMotion();
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy.current) close.current(); }
      if (event.key !== 'Tab') return;
      const elements = [...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')];
      if (!elements.length) { event.preventDefault(); panel.current.focus(); return; }
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => { mounted.current = false; document.removeEventListener('keydown', keyboard, true); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 || selected || sent) { setSearching(false); if(text.length<2)setResults([]); return; }
    const controller = new AbortController();
    setSearching(true); setResults([]); setError(null);
    const timer = setTimeout(async () => {
      try {
        const found = await searchRequestTitles(text, controller.signal);
        if (!controller.signal.aborted) setResults(found);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause.message || 'Search failed. Please try again.');
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, selected, sent]);
  const choose = title => { setSelected(title); setError(null); };
  const submit = async event => {
    event.preventDefault();
    if (!selected || busy.current) return;
    busy.current = true; setSending(true); setError(null);
    try { await sendTitleRequest(selected, audio, subtitles); if(mounted.current)setSent(true); }
    catch (cause) { if(mounted.current)setError(cause.message || 'Your request could not be sent.'); }
    finally { busy.current = false; if(mounted.current)setSending(false); }
  };
  return createPortal(<motion.div className="request-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .22 }} onClick={event => {if(event.target===event.currentTarget && !busy.current)onClose();}}>
    <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="request-modal-title" aria-describedby="request-modal-description" tabIndex={-1} className="request-modal" initial={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : .98 }} transition={{ duration: reduce ? 0 : .3, ease: [.16,1,.3,1] }}>
      <header className="request-modal-heading"><div><h2 id="request-modal-title">Request a title</h2><p id="request-modal-description">Find your next movie or show.</p></div><button type="button" aria-label="Close requests" disabled={sending} onClick={onClose}>×</button></header>
      {!sent && <div className="request-modal-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input ref={input} aria-label="Search movies and shows" placeholder="Search movies and shows" value={query} maxLength={150} disabled={sending} onChange={e=>{setQuery(e.target.value);setSelected(null);setError(null);}}/>{searching && <span className="request-search-spinner" aria-label="Searching" role="status"/>}</div>}
      <AnimatePresence mode="wait" initial={false}>
        {sent ? <motion.div key="success" className="request-modal-success" role="status" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.25}}><span aria-hidden="true">✓</span><h3>Your request was sent</h3><p>We’ll review your title and language preferences.</p><button type="button" className="request-send" onClick={onClose}>Done</button></motion.div>
        : selected ? <motion.form key={`${selected.type}-${selected.id}`} className="request-modal-selection" onSubmit={submit} initial={{opacity:0,y:reduce?0:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduce?0:-6}} transition={{duration:.22}}>
          <div className="request-title-row"><TitleRow key={`${selected.type}-${selected.id}`} title={selected} selected/></div>
          <button type="button" className="request-change" disabled={sending} onClick={()=>{setSelected(null);setError(null);input.current?.focus();}}>Choose a different title</button>
          <label>Audio language<input autoComplete="off" maxLength={150} value={audio} disabled={sending} onChange={e=>setAudio(e.target.value)} placeholder="Original audio"/></label>
          <label>Subtitle language <span>(optional)</span><input autoComplete="off" maxLength={150} value={subtitles} disabled={sending} onChange={e=>setSubtitles(e.target.value)} placeholder="No preference"/></label>
          <p className="request-note">Language preferences are requests; availability may vary.</p>
          <button className="request-send" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send request'}</button>
        </motion.form>
        : <motion.div key="results" className="request-modal-results" aria-busy={searching} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.18}}>
          {results.map((title,index)=><motion.button type="button" key={`${title.type}-${title.id}`} className="request-title-row" onClick={()=>choose(title)} initial={{opacity:0,y:reduce?0:8}} animate={{opacity:1,y:0}} transition={{duration:.25,delay:reduce?0:Math.min(index*.025,.15)}}><TitleRow title={title}/></motion.button>)}
          {!results.length && <p className="request-empty" role="status">{searching ? 'Searching titles…' : error ? 'Try searching again in a moment.' : query.trim().length<2 ? 'Search for a title to get started.' : 'No titles found. Try another name.'}</p>}
        </motion.div>}
      </AnimatePresence>
      {error && <p className="request-modal-error" role="alert">{error}</p>}
      <footer className="request-attribution">Search powered by TMDB. This product is not endorsed or certified by TMDB.</footer>
    </motion.div>
  </motion.div>,document.body);
}
