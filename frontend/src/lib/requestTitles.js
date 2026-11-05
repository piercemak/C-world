import { apiFetch } from './apiClient.js';

async function readResponse(response) {
  if (!response) throw new Error('Please sign in again to request a title.');
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || data?.detail || 'The request service is unavailable. Please try again.');
  if (!data) throw new Error('The request service returned an unreadable response. Please try again.');
  return data;
}
export async function searchRequestTitles(query, signal) {
  const data = await readResponse(await apiFetch(`/api/request-search/?q=${encodeURIComponent(query.trim())}`, { auth: true, signal }));
  return Array.isArray(data.results) ? data.results.filter(title => title.id && title.title && ['movie', 'tv'].includes(title.type)) : [];
}
export function requestPayload(title, audio, subtitles) {
  return {
    mediaRequest: `${title.title} (${title.year || 'Year unknown'}) • ${title.type === 'tv' ? 'Show' : 'Movie'}\nhttps://www.themoviedb.org/${title.type}/${title.id}`,
    languageSubs: `Audio: ${audio.trim() || 'Original audio'}\nSubtitles: ${subtitles.trim() || 'No preference'}`,
  };
}
export async function sendTitleRequest(title, audio, subtitles) {
  const data = await readResponse(await apiFetch('/api/send-request/', { auth: true, method: 'POST', body: JSON.stringify(requestPayload(title, audio, subtitles)) }));
  if (!data.success) throw new Error(data.error || 'Your request was not sent. Please try again.');
}
