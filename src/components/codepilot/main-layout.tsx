
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
import { Settings, Bot, GitBranch, Files, LayoutGrid, MessageSquare, Edit3, Layers } from 'lucide-react';
import { FileExplorer } from './file-explorer';
import { GitControls } from './git-controls';
import { CodeEditor } from './code-editor';
import { ConsoleOutput } from './console-output'; // Still used for non-"Others" tabs
import { AgentPanels } from './agent-panels';
import { CanvasGitActions } from './canvas-git-actions';
import ProjectConsole from './project-console'; // Import the new component
import type { FileSystem, LogEntry, AgentType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Card not directly used in "Others" now
import { cn } from '@/lib/utils';
import InstructionChat from './instruction-chat';

interface MainLayoutProps {
  // Git State
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  token: string;
  setToken: (token: string) => void;
  isCloned: boolean;
  onClone: () => void;
  onPull: () => void;
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onPush: () => void;

  // File System State
  files: FileSystem;
  selectedFilePath: string | null;
  currentFileContent: string;
  onFileSelect: (path: string) => void;
  setFileContent: (path: string, content: string) => void;
  
  instruction: string; // Retained for potential use if InstructionInput is re-added for agents
  setInstruction: (instruction: string) => void; // Retained for potential use
  selectedAgent: AgentType | null;
  setSelectedAgent: (agent: AgentType | null) => void;
  isSubmittingInstruction: boolean; // Retained for potential use
  submitInstruction: () => void; // Retained for potential use
  
  logs: LogEntry[]; // Global logs, ProjectConsole will manage its own for "Others" tab
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;

  applyPatch: (patch: string) => void;
}

export function MainLayout(props: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState('agents'); // Default to agents

  const isAgentsTabActive = activeSidebarTab === 'agents';
  const isChatTabActive = activeSidebarTab === 'chat';
  const isGitTabActive = activeSidebarTab === 'git';
  const isCanvasTabActive = activeSidebarTab === 'canvas';
  const isOthersTabActive = activeSidebarTab === 'others';
  
  // Show bottom console only if none of the full-pane tabs are active
  const showBottomConsole = !isChatTabActive && !isAgentsTabActive && !isGitTabActive && !isCanvasTabActive && !isOthersTabActive;
  
  // Left column content is hidden for Chat, Agents, and Others tabs.
  // For Git Tab, the left column IS shown (it holds GitControls)
  // For Canvas Tab, left column is FileExplorer
  const showLeftColumnContent = isGitTabActive || isCanvasTabActive;


  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
                isActive={isAgentsTabActive}
                onClick={() => setActiveSidebarTab('agents')}
              >
                <Bot /> <span>Agents</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Chat"
                isActive={isChatTabActive}
                onClick={() => setActiveSidebarTab('chat')}
              >
                <MessageSquare /> <span>Chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Git Controls"
                isActive={isGitTabActive}
                onClick={() => setActiveSidebarTab('git')}
              >
                <GitBranch /> <span>Git Controls</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Canvas"
                isActive={isCanvasTabActive}
                onClick={() => setActiveSidebarTab('canvas')}
              >
                <Edit3 /> <span>Canvas</span> 
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Others"
                isActive={isOthersTabActive}
                onClick={() => setActiveSidebarTab('others')}
              >
                <Layers /> <span>Others</span> 
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

        <div className={cn(
          "flex-grow grid md:grid-cols-3 gap-4 p-4 overflow-auto",
          // Remove bottom padding if any of these tabs are active, as they might have their own full-height scroll.
          (isAgentsTabActive || isGitTabActive || isCanvasTabActive || isOthersTabActive || isChatTabActive) && "pb-4", 
          isChatTabActive && "p-0 md:p-2", // Special padding for chat
          isOthersTabActive && "p-0 md:p-2" // Special padding for others tab to allow full bleed
        )}>
          
          {/* Left Column (Sidebar Content / GitControls / FileExplorer for Canvas) */}
          <div className={cn(
              "md:col-span-1 flex-col gap-4 h-full overflow-y-auto",
              showLeftColumnContent ? "flex" : "hidden md:flex",
              (isAgentsTabActive || isChatTabActive || isOthersTabActive) && "hidden", // Hide for these tabs
              isCanvasTabActive && "flex" // For Canvas, left column is FileExplorer
            )}>
              {isGitTabActive && (
                <GitControls
                  repoUrl={props.repoUrl}
                  setRepoUrl={props.setRepoUrl}
                  token={props.token}
                  setToken={props.setToken}
                  onClone={props.onClone}
                  onPull={props.onPull}
                  isCloned={props.isCloned}
                />
              )}
              {isCanvasTabActive && (
                <FileExplorer
                    files={props.files}
                    selectedFilePath={props.selectedFilePath}
                    onFileSelect={props.onFileSelect}
                />
              )}
            </div>


          {/* Center Column (Agent Panels / Code Editor / Chat Interface / Canvas / ProjectConsole for Others) */}
          <div className={cn(
            "flex flex-col h-full overflow-y-auto",
            // If left column is hidden for these tabs, main content spans full width
            (isAgentsTabActive || isChatTabActive || isOthersTabActive) ? "md:col-span-3" : 
            // If Canvas tab or Git tab, it uses 2 cols because left col has content
            (isCanvasTabActive || isGitTabActive) ? "md:col-span-2" : 
            "md:col-span-2", // Default if none of the above
             (isChatTabActive || isOthersTabActive) ? "bg-[#1B262C] rounded-lg" : "" 
          )}>
            {isAgentsTabActive ? (
                <AgentPanels
                  selectedAgent={props.selectedAgent}
                  setSelectedAgent={props.setSelectedAgent}
                  addLog={props.addLog}
                />
            ) : isChatTabActive ? (
                <div className="h-full w-full">
                  <InstructionChat />
                </div>
            ) : isGitTabActive ? (
                <div className="h-full flex flex-col gap-4">
                    <div className="flex-grow basis-1/2 min-h-0">
                         <FileExplorer
                            files={props.files}
                            selectedFilePath={props.selectedFilePath}
                            onFileSelect={props.onFileSelect}
                          />
                    </div>
                    <div className="flex-grow basis-1/2 min-h-0">
                        <CodeEditor
                            filePath={props.selectedFilePath}
                            content={props.currentFileContent}
                            setContent={props.setFileContent}
                            readOnly={true}
                            title={props.selectedFilePath ? `Preview: ${props.selectedFilePath}` : "Select a file to preview"}
                        />
                    </div>
                </div>
            ) : isCanvasTabActive ? (
                <div className="h-full flex flex-col gap-4">
                    <div className="flex-grow min-h-0">
                        <CodeEditor
                            filePath={props.selectedFilePath}
                            content={props.currentFileContent}
                            setContent={props.setFileContent}
                            // title prop removed to default to "Editing: {filePath}"
                        />
                    </div>
                    <div className="shrink-0 mt-auto">
                        <CanvasGitActions
                            onStageAll={props.onStageAll}
                            onCommit={props.onCommit}
                            onPush={props.onPush}
                            isCloned={props.isCloned}
                        />
                    </div>
                </div>
            ) : isOthersTabActive ? (
                 <div className="h-full w-full"> {/* ProjectConsole takes full area */}
                    <ProjectConsole />
                </div>
            ) : ( 
                 <div className="h-full flex items-center justify-center">
                    <p>Select a tab from the sidebar.</p>
                </div>
            )}
          </div>
        </div>
        
        {/* Global Console - only shown if no specific tab is overriding the console display */}
        {showBottomConsole && (
          <div className="h-[200px] md:h-[250px] p-4 pt-0">
            {/* This ConsoleOutput uses the global logs from CodePilotPage */}
            <ConsoleOutput logs={props.logs} />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
