import React, { createContext, useContext, useState } from 'react';

interface ActiveSessionContextType {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextType>({
  activeSessionId: null,
  setActiveSessionId: () => {},
});

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  return (
    <ActiveSessionContext.Provider value={{ activeSessionId, setActiveSessionId }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext);
}
