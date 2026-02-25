import React, { createContext, useState, useContext, useEffect } from 'react';

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

  const fetchAuthed = async (path, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (token) headers.Authorization = `Token ${token}`;

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  };

  const loadProfiles = async () => {
    if (!token) {
      setProfiles([]);
      setActiveProfile(null);
      localStorage.removeItem("activeProfile");
      return;
    }

    const res = await fetchAuthed("/api/profiles/");
    if (!res.ok) return;

    const data = await res.json();
    setProfiles(data);

    const saved = localStorage.getItem("activeProfile");
    const savedId = saved ? JSON.parse(saved)?.id : null;
    const selected = data.find((p) => p.id === savedId) || data[0] || null;
    setActiveProfile(selected);
    if (selected) localStorage.setItem("activeProfile", JSON.stringify(selected));
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await fetchAuthed("/api/auth/me/");
        if (!res.ok) throw new Error("Invalid token");
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        await loadProfiles();
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
      await loadProfiles();
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
      await loadProfiles();
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
    } else {
      localStorage.removeItem("activeProfile");
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
