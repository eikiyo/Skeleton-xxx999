
import React, { useRef, useState, useEffect } from "react";
import { useLogs, type LogEntry } from "@/context/LogContext"; // Import useLogs and LogEntry

export default function ProjectConsole() {
  const { logs, addLog: addLogEntry } = useLogs(); // Use logs from context
  const [consoleOutput, setConsoleOutput] = useState<string>("No logs yet. Start an action to see output here.");
  const [terminalOutput, setTerminalOutput] = useState<string>("Shell terminal interface will be displayed here.");
  const logsRef = useRef<HTMLDivElement>(null);

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
    a.download = `codepilot_project_log_${new Date().toISOString().replace(/:/g, '-')}.txt`;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
  }

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

  useEffect(() => {
    // Check if an initial log already exists to prevent duplication on HMR
    if (!logs.find(log => log.message === 'Project console initialized.' && log.source === 'system')) {
      addLogEntry({source: 'system', message: 'Project console initialized.'});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  return (
    <div className="flex flex-col h-full bg-[#1B262C] text-white font-code">
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
        style={{ minHeight: "200px" }} 
      >
        {logs.length === 0 ? (
          <div className="text-slate-400">No activity recorded yet.</div>
        ) : (
          logs.map((log) => ( // Use log.id for key
            <div key={log.id} className="mb-1">
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
                    : log.source === "error"
                    ? "text-red-400 font-medium"
                    : log.source === "success"
                    ? "text-green-400 font-medium"
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

      <div className="px-4 py-3 mt-4 border-t border-slate-700 bg-[#1B262C]">
        <div className="font-semibold mb-1 text-slate-200">Latest Console Output</div>
        <div className="text-sm text-slate-300 p-2 bg-slate-800 rounded min-h-[40px] whitespace-pre-wrap">{consoleOutput}</div>
      </div>

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
