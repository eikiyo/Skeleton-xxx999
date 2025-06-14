
"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type LogEntry = {
  id: string; // Added ID for keying
  timestamp: number;
  source: "system" | "developer" | "qa" | "user" | "git" | "shell" | "info" | "error" | "success" | "agent"; // Expanded sources
  message: string;
};

type LogContextType = {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void; // Simpler addLog signature
  clearLogs: () => void;
};

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
        ...entry,
        id: String(Date.now()) + Math.random(), // Simple unique ID
        timestamp: Date.now(),
    };
    setLogs((prev) => [...prev, newLog]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogs() {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error("useLogs must be used within LogProvider");
  return ctx;
}
