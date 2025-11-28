export async function getWatchProgress(showId, season, episode) {
  const res = await fetch('/api/progress/');
  const all = await res.json();
  return all.find(p =>
    p.show_id === showId &&
    p.season === season &&
    p.episode === episode
  )?.progress || 0;
}

export async function saveWatchProgress(showId, season, episode, progress) {
  await fetch('/api/progress/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ show_id: showId, season, episode, progress })
  });
}

export async function getUserVolume() {
  const res = await fetch('/api/profile/');
  const profiles = await res.json();
  return profiles?.[0]?.volume ?? 1;
}

export async function saveUserVolume(volume) {
  const res = await fetch('/api/profile/');
  const profiles = await res.json();
  const profileId = profiles?.[0]?.id;
  if (!profileId) return;

  await fetch(`/api/profile/${profileId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volume })
  });
}
