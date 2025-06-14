
"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeveloperAgentPanel } from './developer-agent-panel';
import { QAAgentPanel } from './qa-agent-panel';
import type { AgentType } from '@/types';

interface AgentPanelsProps {
  selectedAgent: AgentType | null;
  setSelectedAgent: (agent: AgentType | null) => void;
  // instruction: string; // Removed: Handled within panels or not at all for this new design
  // currentCode: string; // Removed: QA panel simplified
  // currentFileContentForDeveloperAgent: string; // Removed: Dev panel simplified
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;
  // applyPatch: (patch: string) => void; // Removed: QA panel simplified
  // selectedFilePath: string | null; // Removed: Dev panel simplified
  // setFileContent: (path: string, content: string) => void; // Removed: Dev panel simplified
}

export function AgentPanels({
  selectedAgent,
  setSelectedAgent,
  addLog,
}: AgentPanelsProps) {
  
  const handleTabChange = (value: string) => {
    setSelectedAgent(value as AgentType);
  };

  return (
    <Tabs value={selectedAgent || "developer"} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="developer">Developer Agent</TabsTrigger>
        <TabsTrigger value="qa">QA Agent</TabsTrigger>
      </TabsList>
      <TabsContent value="developer" className="flex-grow">
        <DeveloperAgentPanel 
          addLog={addLog}
        />
      </TabsContent>
      <TabsContent value="qa" className="flex-grow">
        <QAAgentPanel 
          addLog={addLog} 
        />
      </TabsContent>
    </Tabs>
  );
}
