import { apiFetch, getApiBase } from "./apiClient.js";

const DEFAULT_BUCKET_NAME = "all-shows";

export const fetchSignedUrl = async ({ apiBase = getApiBase(), key, bucket = DEFAULT_BUCKET_NAME }) => {
  if (!apiBase || !key) return "";

	  try {
	    const res = await apiFetch(
	      `/api/signed-url/?key=${encodeURIComponent(key)}&bucket=${encodeURIComponent(bucket)}`,
	      { baseUrl: apiBase },
	    );
    const data = await res.json();
    return data.url || "";
  } catch (err) {
    console.error("Failed to fetch signed URL:", err);
    return "";
  }
};

export const fetchSignedEpisodeUrl = async ({
  apiBase = getApiBase(),
  showId,
  season,
  episode,
  bucket = DEFAULT_BUCKET_NAME,
}) => {
  if (!apiBase || !showId || season == null || episode == null) return "";

  try {
    const url =
      "/api/signed-episode-url/" +
      `?show_id=${encodeURIComponent(showId)}` +
      `&season=${encodeURIComponent(season)}` +
      `&episode=${encodeURIComponent(episode)}` +
      `&bucket=${encodeURIComponent(bucket)}`;
	    const res = await apiFetch(url, { baseUrl: apiBase });
    const data = await res.json();
    return data.url || "";
  } catch (err) {
    console.error("Failed to fetch signed episode URL:", err);
    return "";
  }
};
