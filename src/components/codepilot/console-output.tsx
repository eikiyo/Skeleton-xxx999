
"use client";

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogEntry } from '@/types';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, CheckCircle, Terminal, Download } from 'lucide-react';

interface ConsoleOutputProps {
  logs: LogEntry[];
}

export function ConsoleOutput({ logs }: ConsoleOutputProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs]);

  const getIconForType = (type: LogEntry['type']) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4 text-blue-400" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'agent': return <Terminal className="h-4 w-4 text-purple-400" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const handleExportLogs = () => {
    const logContent = logs.map(log => `[${log.timestamp.toISOString()}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `codepilot_logs_${new Date().toISOString()}.txt`;
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
                  log.type === 'error' && 'text-red-400',
                  log.type === 'success' && 'text-green-400',
                  log.type === 'agent' && 'text-purple-400'
                )}
              >
                <span className="flex-shrink-0 mt-0.5">{getIconForType(log.type)}</span>
                <span className="flex-shrink-0 text-muted-foreground">[{log.timestamp.toLocaleTimeString()}]</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
