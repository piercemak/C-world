import React, { createContext, useState, useContext, useEffect } from 'react';
import { hydrateWatchDataFromServer } from "../lib/watchSync.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(() => {
    const saved = localStorage.getItem("activeProfile");
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  const syncProfilePreferences = (profile) => {
    if (!profile) {
      localStorage.removeItem("profileImage");
      localStorage.removeItem("userProfileImage");
      localStorage.removeItem("archiveSelectedBackdrop");
      return;
    }

    if (profile.avatar_url) {
      localStorage.setItem("profileImage", profile.avatar_url);
      localStorage.setItem("userProfileImage", profile.avatar_url);
    } else {
      localStorage.removeItem("profileImage");
      localStorage.removeItem("userProfileImage");
    }

    if (profile.archive_backdrop) {
      localStorage.setItem("archiveSelectedBackdrop", profile.archive_backdrop);
    } else {
      localStorage.removeItem("archiveSelectedBackdrop");
    }
  };

  const fetchAuthed = async (path, options = {}, tokenOverride = null) => {
    const authToken = tokenOverride || token;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (authToken) headers.Authorization = `Token ${authToken}`;

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  };

  const loadProfiles = async (tokenOverride = null) => {
    const authToken = tokenOverride || token;
    if (!authToken) {
      setProfiles([]);
      setActiveProfile(null);
      localStorage.removeItem("activeProfile");
      return null;
    }

    const res = await fetchAuthed("/api/profiles/", {}, authToken);
    if (!res.ok) return;

    const data = await res.json();
    setProfiles(data);

    const saved = localStorage.getItem("activeProfile");
    const savedId = saved ? JSON.parse(saved)?.id : null;
    const selected = data.find((p) => p.id === savedId) || data[0] || null;
    setActiveProfile(selected);
    if (selected) {
      localStorage.setItem("activeProfile", JSON.stringify(selected));
    } else {
      localStorage.removeItem("activeProfile");
    }
    syncProfilePreferences(selected);
    return selected;
  };

  const updateActiveProfile = async (patch) => {
    if (!token || !activeProfile?.id) return null;

    const res = await fetchAuthed(`/api/profiles/${activeProfile.id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      throw new Error("Failed to update profile");
    }

    const updated = await res.json();
    setProfiles((prev) => prev.map((profile) => (
      profile.id === updated.id ? updated : profile
    )));
    setActiveProfile(updated);
    localStorage.setItem("activeProfile", JSON.stringify(updated));
    syncProfilePreferences(updated);
    return updated;
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await fetchAuthed("/api/auth/me/", {}, token);
        if (!res.ok) throw new Error("Invalid token");
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        const selected = await loadProfiles();
        if (selected?.id) {
          await hydrateWatchDataFromServer(selected.id);
        }
      } catch {
        setUser(null);
        setToken(null);
        setProfiles([]);
        setActiveProfile(null);
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
        localStorage.removeItem("activeProfile");
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) return { success: false, error: data.error || "Login failed" };

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);
      const selected = await loadProfiles(data.token);
      if (selected?.id) {
        await hydrateWatchDataFromServer(selected.id);
      }
      return { success: true };
    } catch {
      return { success: false, error: "Unable to reach server. Check backend/CORS settings." };
    }
  };

  const register = async ({ username, email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Registration failed" };

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);
      const selected = await loadProfiles(data.token);
      if (selected?.id) {
        await hydrateWatchDataFromServer(selected.id);
      }
      return { success: true };
    } catch {
      return { success: false, error: "Unable to reach server. Check backend/CORS settings." };
    }
  };

  const setActiveProfileById = (profileId) => {
    const profile = profiles.find((p) => p.id === profileId) || null;
    setActiveProfile(profile);
    if (profile) {
      localStorage.setItem("activeProfile", JSON.stringify(profile));
      syncProfilePreferences(profile);
      hydrateWatchDataFromServer(profile.id);
    } else {
      localStorage.removeItem("activeProfile");
      syncProfilePreferences(null);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetchAuthed("/api/auth/logout/", { method: "POST" });
      } catch {
        // Ignore network errors while clearing local session.
      }
    }
    setUser(null);
    setToken(null);
    setProfiles([]);
    setActiveProfile(null);
    localStorage.removeItem('user');
    localStorage.removeItem("authToken");
    localStorage.removeItem("activeProfile");
    syncProfilePreferences(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        profiles,
        activeProfile,
        authLoading,
        login,
        register,
        logout,
        loadProfiles,
        setActiveProfileById,
        updateActiveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
