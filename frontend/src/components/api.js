import { apiFetch } from "../lib/apiClient.js";

export async function getWatchProgress(showId, season, episode) {
  const res = await apiFetch('/api/progress/', { auth: true });
  if (!res?.ok) return 0;
  const all = await res.json();
  return all.find(p =>
    p.show_id === showId &&
    p.season === season &&
    p.episode === episode
  )?.progress || 0;
}

export async function saveWatchProgress(showId, season, episode, progress) {
  await apiFetch('/api/progress/', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ show_id: showId, season, episode, progress })
  });
}

export async function getUserVolume() {
  const res = await apiFetch('/api/profile/', { auth: true });
  if (!res?.ok) return 1;
  const profiles = await res.json();
  return profiles?.[0]?.volume ?? 1;
}

export async function saveUserVolume(volume) {
  const res = await apiFetch('/api/profile/', { auth: true });
  if (!res?.ok) return;
  const profiles = await res.json();
  const profileId = profiles?.[0]?.id;
  if (!profileId) return;

  await apiFetch(`/api/profile/${profileId}/`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ volume })
  });
}
