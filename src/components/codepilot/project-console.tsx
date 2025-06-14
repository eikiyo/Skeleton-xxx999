
import React, { useRef, useState, useEffect } from "react";

// Message structure for logs and console
type LogEntry = {
  timestamp: number;
  source: "system" | "developer" | "qa" | "user" | "git" | "shell";
  message: string;
};

// Dummy hook: Replace with actual log provider/backend subscription
// For now, let's add a way to add logs for demonstration if needed, though it's self-contained.
function useProjectLogs(): [LogEntry[], (entry: LogEntry) => void, () => void] {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const addLog = React.useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  // Example: Add logs by calling this
  // Replace/add with WebSocket or backend subscription
  return [logs, addLog, () => {}]; // Returning addLog for potential external use if ever needed
}

export default function ProjectConsole() {
  const [logs, addLogToInternalState] = useProjectLogs(); // Using internal addLog for now
  const [consoleOutput, setConsoleOutput] = useState<string>("No logs yet. Start an action to see output here.");
  const [terminalOutput, setTerminalOutput] = useState<string>("Shell terminal interface will be displayed here.");
  const logsRef = useRef<HTMLDivElement>(null);

  // Export logs as .txt
  function handleExportLogs() {
    if (logs.length === 0) {
        alert("No logs to export.");
        return;
    }
    const logText = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleString()}] [${log.source.toUpperCase()}] ${log.message}`
      )
      .join("\n");
    const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "codepilot-project-log.txt";
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url);
  }

  // Scroll to bottom on new log & update console output
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
    if (logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      setConsoleOutput(`[${latestLog.source.toUpperCase()}] ${latestLog.message}`);
    } else {
      setConsoleOutput("No logs yet. Start an action to see output here.");
    }
  }, [logs]);

  // DEMO: Add a welcome log on mount
  useEffect(() => {
    addLogToInternalState({timestamp: Date.now(), source: 'system', message: 'Project console initialized.'});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="flex flex-col h-full bg-[#1B262C] text-white font-code">
      {/* Project Log Section */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-700">
        <div className="font-semibold text-lg text-slate-200">Project Activity Log</div>
        <button
          onClick={handleExportLogs}
          className="bg-[#415A77] px-3 py-1.5 rounded text-white text-sm hover:bg-[#55708d] transition-colors disabled:opacity-50"
          disabled={logs.length === 0}
        >
          Export Full Log
        </button>
      </div>
      <div
        className="flex-grow overflow-y-auto px-4 py-3 text-xs bg-[#232d36] rounded-b-lg"
        ref={logsRef}
        style={{ minHeight: "200px" }} // Ensure it has some min height
      >
        {logs.length === 0 ? (
          <div className="text-slate-400">No activity recorded yet.</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="mb-1">
              <span className="text-slate-500">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>{" "}
              <span
                className={
                  log.source === "system"
                    ? "text-[#778DA9] font-medium"
                    : log.source === "developer"
                    ? "text-emerald-400 font-medium"
                    : log.source === "qa"
                    ? "text-amber-400 font-medium"
                    : log.source === "git"
                    ? "text-sky-400 font-medium"
                    : log.source === "shell"
                    ? "text-red-400 font-medium"
                    : log.source === "user"
                    ? "text-slate-300 font-medium"
                    : "text-slate-100 font-medium"
                }
              >
                [{log.source.toUpperCase()}]
              </span>{" "}
              <span className="text-slate-100 whitespace-pre-wrap">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Console Output Preview */}
      <div className="px-4 py-3 mt-4 border-t border-slate-700 bg-[#1B262C]">
        <div className="font-semibold mb-1 text-slate-200">Latest Console Output</div>
        <div className="text-sm text-slate-300 p-2 bg-slate-800 rounded min-h-[40px]">{consoleOutput}</div>
      </div>

      {/* Shell Terminal Placeholder */}
      <div className="px-4 py-3 mt-4 border-t border-slate-700 bg-[#1B262C]">
        <div className="font-semibold mb-1 text-slate-200">Shell Terminal</div>
        <div className="text-xs text-slate-400 p-2 bg-slate-800 rounded min-h-[60px]">
          {terminalOutput}
          <br />
          <span className="italic">
            (Interactive shell functionality is not yet implemented.)
          </span>
        </div>
      </div>
    </div>
  );
}
