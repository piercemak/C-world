import React, { createContext, useContext, useEffect, useState } from "react";

const SnowContext = createContext(null);

export function SnowProvider({ children }) {
  const [snowEnabled, setSnowEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("snowEnabled");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("snowEnabled", JSON.stringify(snowEnabled));
  }, [snowEnabled]);

  return (
    <SnowContext.Provider value={{ snowEnabled, setSnowEnabled }}>
      {children}
    </SnowContext.Provider>
  );
}

export function useSnow() {
  const ctx = useContext(SnowContext);
  if (!ctx) throw new Error("useSnow must be used inside <SnowProvider />");
  return ctx;
}
