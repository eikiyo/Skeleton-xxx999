
"use client";

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogEntry } from '@/types'; // Uses LogEntry from context/types
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, CheckCircle, Terminal, Download, GitMerge, Shell } from 'lucide-react'; // Added GitMerge, Shell
import { useLogs } from '@/context/LogContext';

interface ConsoleOutputProps {
  // logs prop removed, will use context
}

export function ConsoleOutput({ }: ConsoleOutputProps) {
  const { logs } = useLogs(); // Get logs from context
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs]);

  const getIconForType = (type: LogEntry['source']) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4 text-blue-400" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'agent': return <Terminal className="h-4 w-4 text-purple-400" />;
      case 'developer': return <Terminal className="h-4 w-4 text-emerald-400" />;
      case 'qa': return <Terminal className="h-4 w-4 text-amber-400" />;
      case 'user': return <Terminal className="h-4 w-4 text-slate-400" />;
      case 'git': return <GitMerge className="h-4 w-4 text-sky-400" />;
      case 'shell': return <Shell className="h-4 w-4 text-rose-400" />;
      case 'system': return <Info className="h-4 w-4 text-gray-400" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const handleExportLogs = () => {
    const logContent = logs.map(log => `[${new Date(log.timestamp).toISOString()}] [${log.source.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `codepilot_logs_${new Date().toISOString().replace(/:/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium font-headline">Console</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportLogs} disabled={logs.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export Logs
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div className="p-3 space-y-1 text-sm">
            {logs.length === 0 && (
              <p className="text-muted-foreground p-1.5">No logs yet. Start an action to see output here.</p>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "flex items-start gap-2 p-1.5 rounded-sm font-code animate-fadeIn",
                   // Color styling can be enhanced based on new source types
                  log.source === 'error' && 'text-red-400',
                  log.source === 'success' && 'text-green-400',
                  (log.source === 'agent' || log.source === 'developer' || log.source === 'qa') && 'text-purple-400'
                )}
              >
                <span className="flex-shrink-0 mt-0.5">{getIconForType(log.source)}</span>
                <span className="flex-shrink-0 text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="break-all whitespace-pre-wrap">{log.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
