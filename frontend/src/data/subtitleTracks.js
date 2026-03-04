const MOVIE_SUBTITLE_TRACKS = {
  "perfect-blue": "/videos/perfectblue/perfectblue.vtt",
  "paprika": "/videos/paprika/paprikaSub.vtt",
  "the-vanishing": "/videos/thevanishing/thevanishing_subtitles.vtt",
  "ghost-in-the-shell": "/videos/ghostintheshell/ghostintheshell_subtitles.vtt",
  "tokyo-godfathers": "/videos/tokyogodfathers/tokyogodfathers_subtitles.vtt",
  "solaris": "/videos/solaris/solaris_subtitles.vtt",
  "demons": "/videos/demons/demons_subtitles.vtt",
  "akira": "/videos/akira/akira_subtitles.vtt",
  "exmachina": "/videos/exmachina/exmachina.vtt",
  "annihilation": "/videos/annihilation/annihilation_subtitles.vtt",
  "redline": "/videos/redline/redline_subtitles.vtt",
  "bugonia": "/videos/bugonia/bugonia_subtitles.vtt",
  "frankenstein": "/videos/frankenstein/frankenstein_subtitles.vtt",
  "sunsetboulevard": "/videos/sunsetboulevard/sunsetboulevard_subtitles.vtt",
};

const SERIES_SUBTITLE_PATTERNS = {
  "neon-genesis": "/subtitles/neongenesis/season{season}/S{season}E{episode2}_subtitles.vtt",
  "mob-psycho": "/subtitles/mobpsycho/season{season}/S{season}E{episode2}_subtitles.vtt",
  fmab: "/subtitles/fmab/season{season}/S{season}E{episode2}_subtitles.vtt",
  jjk: "/subtitles/jjk/season{season}/S{season}E{episode2}_subtitles.vtt",
  cyberpunk: "/subtitles/cyberpunk/season{season}/S{season}E{episode2}_subtitles.vtt",
  severance: "/subtitles/severance/season{season}/S{season}E{episode2}_subtitles.vtt",
  pluribus: "/subtitles/pluribus/season{season}/S{season}E{episode2}_subtitles.vtt",
  itsalwayssunny: "/subtitles/itsalwayssunny/season{season}/S{season}E{episode2}_subtitles.vtt",
  truedetective: "/subtitles/truedetective/season{season}/S{season}E{episode2}_subtitles.vtt",
};

const fillPattern = (pattern, season, episode) => {
  const seasonNum = Number(season);
  const episodeNum = Number(episode);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return null;

  return pattern
    .replaceAll("{season}", String(seasonNum))
    .replaceAll("{episode}", String(episodeNum))
    .replaceAll("{episode2}", String(episodeNum).padStart(2, "0"));
};

export const getSubtitleTrackSrc = ({ showId, season = null, episode = null }) => {
  if (!showId) return null;

  if (MOVIE_SUBTITLE_TRACKS[showId]) {
    return MOVIE_SUBTITLE_TRACKS[showId];
  }

  const pattern = SERIES_SUBTITLE_PATTERNS[showId];
  if (!pattern) return null;

  return fillPattern(pattern, season, episode);
};

