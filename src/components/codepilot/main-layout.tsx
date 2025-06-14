
"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Settings, Bot, GitBranch, Files, LayoutGrid, MessageSquare } from 'lucide-react';
import { FileExplorer } from './file-explorer';
import { GitControls } from './git-controls';
import { CodeEditor } from './code-editor';
import { ConsoleOutput } from './console-output';
import { InstructionInput } from './instruction-input';
import { AgentPanels } from './agent-panels';
import type { FileSystem, LogEntry, AgentType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  // Git State
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  token: string;
  setToken: (token: string) => void;
  isCloned: boolean;
  onClone: () => void;
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onPush: () => void;

  // File System State
  files: FileSystem;
  selectedFilePath: string | null;
  currentFileContent: string;
  onFileSelect: (path: string) => void;
  setFileContent: (path: string, content: string) => void;
  
  // Instruction & Agent State
  instruction: string;
  setInstruction: (instruction: string) => void;
  selectedAgent: AgentType | null;
  setSelectedAgent: (agent: AgentType | null) => void;
  isSubmittingInstruction: boolean;
  submitInstruction: () => void;
  
  // Console State
  logs: LogEntry[];
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;

  // Patch application
  applyPatch: (patch: string) => void;
}

export function MainLayout(props: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState('agents');

  const isAgentsTabActive = activeSidebarTab === 'agents';


  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Placeholder for Logo */}
            <LayoutGrid className="w-7 h-7 text-primary" />
            <span className="text-lg font-semibold font-headline text-primary group-data-[collapsible=icon]:hidden">CodePilot</span>
          </div>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarMenu className="space-y-1 p-2">
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Agents" 
                isActive={isAgentsTabActive || activeSidebarTab === 'agents'}
                onClick={() => setActiveSidebarTab('agents')}
              >
                <Bot /> <span>Agents</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Chat"
                isActive={activeSidebarTab === 'chat'}
                onClick={() => setActiveSidebarTab('chat')}
              >
                <MessageSquare /> <span>Chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Git Controls"
                isActive={activeSidebarTab === 'git'}
                onClick={() => setActiveSidebarTab('git')}
              >
                <GitBranch /> <span>Git Controls</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Files"
                isActive={activeSidebarTab === 'files'}
                onClick={() => setActiveSidebarTab('files')}
              >
                <Files /> <span>File Explorer</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings className="w-4 h-4" />
            <span className="group-data-[collapsible=icon]:hidden">Settings</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="p-3 border-b flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-primary" />
                <span className="text-md font-semibold font-headline text-primary">CodePilot</span>
            </div>
            <SidebarTrigger />
        </header>

        <div className="flex-grow grid md:grid-cols-3 gap-4 p-4 overflow-auto">
          {/* Left Column (Sidebar Content) - Hidden in Chat mode */}
          {activeSidebarTab !== 'chat' && (
            <div className="md:col-span-1 flex flex-col gap-4 h-full overflow-y-auto">
              {activeSidebarTab === 'agents' && (
                <InstructionInput
                  instruction={props.instruction}
                  setInstruction={props.setInstruction}
                  onSubmit={props.submitInstruction}
                  isSubmitting={props.isSubmittingInstruction}
                  selectedAgent={props.selectedAgent}
                />
              )}
              {activeSidebarTab === 'git' && (
                <GitControls
                  repoUrl={props.repoUrl}
                  setRepoUrl={props.setRepoUrl}
                  token={props.token}
                  setToken={props.setToken}
                  onClone={props.onClone}
                  onStageAll={props.onStageAll}
                  onCommit={props.onCommit}
                  onPush={props.onPush}
                  isCloned={props.isCloned}
                />
              )}
              {activeSidebarTab === 'files' && (
                <Card className="h-full shadow-sm">
                  <FileExplorer
                    files={props.files}
                    selectedFilePath={props.selectedFilePath}
                    onFileSelect={props.onFileSelect}
                  />
                </Card>
              )}
            </div>
          )}

          {/* Center Column (Agent Panels / Code Editor / Chat Interface) */}
          {/* Takes full width in chat mode */}
          <div className={cn(
            "flex flex-col h-full overflow-y-auto",
            activeSidebarTab === 'chat' ? "md:col-span-3" : "md:col-span-2"
          )}>
            {activeSidebarTab === 'agents' ? (
                <AgentPanels
                  selectedAgent={props.selectedAgent}
                  setSelectedAgent={props.setSelectedAgent}
                  instruction={props.instruction}
                  currentCode={props.currentFileContent} 
                  currentFileContentForDeveloperAgent={props.currentFileContent}
                  selectedFilePath={props.selectedFilePath}
                  setFileContent={props.setFileContent}
                  addLog={props.addLog}
                  applyPatch={props.applyPatch}
                />
            ) : activeSidebarTab === 'chat' ? (
                <>
                  {/* Chat Messages Area */}
                  <div className="flex-grow min-h-0">
                    <Card className="h-full flex flex-col items-center justify-center shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-headline text-center">Chat Interface</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center">
                                This is the dedicated chat area. <br/> (Messages will appear here)
                            </p>
                        </CardContent>
                    </Card>
                  </div>
                  {/* Chat Input Area */}
                  <div className="shrink-0 basis-[20%] min-h-[144px] mt-4">
                    <InstructionInput
                      instruction={props.instruction}
                      setInstruction={props.setInstruction}
                      onSubmit={props.submitInstruction}
                      isSubmitting={props.isSubmittingInstruction}
                      selectedAgent={props.selectedAgent} 
                    />
                  </div>
                </>
            ) : ( // This covers 'git' and 'files' tabs for the center panel
                 <div className="h-full">
                    <CodeEditor
                    filePath={props.selectedFilePath}
                    content={props.currentFileContent}
                    setContent={props.setFileContent}
                    />
                </div>
            )}
          </div>
        </div>
        
        {/* Bottom section for Console - conditionally rendered (hidden for chat) */}
        {activeSidebarTab !== 'chat' && (
          <div className="h-[200px] md:h-[250px] p-4 pt-0">
            <ConsoleOutput logs={props.logs} />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
