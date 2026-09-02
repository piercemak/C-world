const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const ACTIVE_PROFILE_ID_KEY = "activeProfileId";

export const getApiBase = () => API_BASE;

export const getAuthContext = () => {
  const token = localStorage.getItem("authToken");
  const directProfileId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);

  if (directProfileId) {
    return { token, profileId: Number(directProfileId) || null };
  }

  try {
    const activeProfile = JSON.parse(localStorage.getItem("activeProfile") || "null");
    return { token, profileId: activeProfile?.id || null };
  } catch {
    return { token, profileId: null };
  }
};

export const apiFetch = async (
  path,
	  {
	    auth = false,
	    baseUrl = API_BASE,
	    profileId = null,
	    headers = {},
	    parseJson = false,
	    ...options
  } = {},
) => {
  const requestHeaders = { ...headers };

  if (options.body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const authContext = getAuthContext();
    if (!authContext.token) return null;
    requestHeaders.Authorization = `Token ${authContext.token}`;

    const effectiveProfileId = profileId ?? authContext.profileId;
    if (effectiveProfileId != null) {
      requestHeaders["X-Profile-Id"] = String(effectiveProfileId);
    }
  }

	  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: requestHeaders,
  });

  if (!parseJson) return response;
  if (response.status === 204) return null;
  return response.json();
};
