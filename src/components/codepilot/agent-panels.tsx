"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeveloperAgentPanel } from './developer-agent-panel';
import { QAAgentPanel } from './qa-agent-panel';
import type { AgentType } from '@/types';

interface AgentPanelsProps {
  selectedAgent: AgentType | null;
  setSelectedAgent: (agent: AgentType | null) => void;
  instruction: string;
  currentCode: string;
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;
  applyPatch: (patch: string) => void;
}

export function AgentPanels({
  selectedAgent,
  setSelectedAgent,
  instruction,
  currentCode,
  addLog,
  applyPatch
}: AgentPanelsProps) {
  
  const handleTabChange = (value: string) => {
    setSelectedAgent(value as AgentType);
  };

  return (
    <Tabs value={selectedAgent || "developer"} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="developer">Developer Agent</TabsTrigger>
        <TabsTrigger value="qa">QA Agent</TabsTrigger>
      </TabsList>
      <TabsContent value="developer">
        <DeveloperAgentPanel instruction={instruction} addLog={addLog} />
      </TabsContent>
      <TabsContent value="qa">
        <QAAgentPanel currentCode={currentCode} addLog={addLog} applyPatch={applyPatch} />
      </TabsContent>
    </Tabs>
  );
}
