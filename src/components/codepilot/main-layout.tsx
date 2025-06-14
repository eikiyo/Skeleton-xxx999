
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
import { Settings, Bot, GitBranch, Files, LayoutGrid, MessageSquare, Edit3, Layers, RefreshCw } from 'lucide-react'; // Added Layers, RefreshCw
import { FileExplorer } from './file-explorer';
import { GitControls } from './git-controls';
import { CodeEditor } from './code-editor';
import { ConsoleOutput } from './console-output';
import { AgentPanels } from './agent-panels';
import { CanvasGitActions } from './canvas-git-actions';
import type { FileSystem, LogEntry, AgentType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  onPull: () => void; // New prop for Pull
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onPush: () => void;

  // File System State
  files: FileSystem;
  selectedFilePath: string | null;
  currentFileContent: string;
  onFileSelect: (path: string) => void;
  setFileContent: (path: string, content: string) => void;
  
  instruction: string;
  setInstruction: (instruction: string) => void;
  selectedAgent: AgentType | null;
  setSelectedAgent: (agent: AgentType | null) => void;
  isSubmittingInstruction: boolean;
  submitInstruction: () => void;
  
  logs: LogEntry[];
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;

  applyPatch: (patch: string) => void;
}

export function MainLayout(props: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [activeSidebarTab, setActiveSidebarTab] = React.useState('agents');

  const isAgentsTabActive = activeSidebarTab === 'agents';
  const isChatTabActive = activeSidebarTab === 'chat';
  const isGitTabActive = activeSidebarTab === 'git';
  const isCanvasTabActive = activeSidebarTab === 'canvas';
  const isOthersTabActive = activeSidebarTab === 'others';
  
  const showBottomConsole = !isChatTabActive && !isAgentsTabActive && !isGitTabActive && !isCanvasTabActive && !isOthersTabActive;
  
  // Left column content is hidden for Chat, Agents, Others, and Canvas (Canvas manages its own FileExplorer implicitly)
  // For Git Tab, the left column IS shown (it holds GitControls)
  const showLeftColumnContent = isGitTabActive;


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
          (isAgentsTabActive || isGitTabActive || isCanvasTabActive || isOthersTabActive) && "pb-4",
          isChatTabActive && "p-0 md:p-2" 
        )}>
          
          {/* Left Column (Sidebar Content / GitControls / FileExplorer for Canvas) */}
          <div className={cn(
              "md:col-span-1 flex-col gap-4 h-full overflow-y-auto",
              showLeftColumnContent ? "flex" : "hidden md:flex", // Always flex for md if shown
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
              {isCanvasTabActive && ( // FileExplorer for Canvas Tab
                <FileExplorer
                    files={props.files}
                    selectedFilePath={props.selectedFilePath}
                    onFileSelect={props.onFileSelect}
                />
              )}
            </div>


          {/* Center Column (Agent Panels / Code Editor / Chat Interface / Canvas / Others) */}
          <div className={cn(
            "flex flex-col h-full overflow-y-auto",
            // If left column is hidden for these tabs, main content spans full width
            (isAgentsTabActive || isChatTabActive || isOthersTabActive) ? "md:col-span-3" : 
            // If Canvas tab, it uses 2 cols because left col is FileExplorer
            isCanvasTabActive ? "md:col-span-2" :
            // For Git tab, it also uses 2 cols as left col has GitControls
            isGitTabActive ? "md:col-span-2" : 
            "md:col-span-2", // Default if none of the above
             isChatTabActive ? "bg-[#1B262C] rounded-lg" : "" 
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
            ) : isGitTabActive ? ( // Git Controls Tab - Center Panel with FileExplorer and ReadOnly CodeEditor
                <div className="h-full flex flex-col gap-4">
                    <div className="flex-grow basis-1/2 min-h-0"> {/* File Explorer takes top half */}
                         <FileExplorer
                            files={props.files}
                            selectedFilePath={props.selectedFilePath}
                            onFileSelect={props.onFileSelect}
                          />
                    </div>
                    <div className="flex-grow basis-1/2 min-h-0"> {/* Code Editor takes bottom half */}
                        <CodeEditor
                            filePath={props.selectedFilePath}
                            content={props.currentFileContent}
                            setContent={props.setFileContent} // Still pass for consistency, but readOnly controls it
                            readOnly={true}
                            title={props.selectedFilePath ? `Preview: ${props.selectedFilePath}` : "Select a file to preview"}
                        />
                    </div>
                </div>
            ) : isCanvasTabActive ? ( // Canvas Tab - Center Panel (CodeEditor for editing, GitActions)
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
                 <div className="h-full flex flex-col gap-4">
                    <div className="flex-grow basis-2/3 min-h-0">
                        <ConsoleOutput logs={props.logs} />
                    </div>
                    <div className="shrink-0 basis-1/3">
                        <Card className="h-full shadow-sm">
                            <CardHeader className="py-3 px-4 border-b">
                                <CardTitle className="text-base font-medium font-headline">Shell Terminal</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 h-full flex items-center justify-center">
                                <p className="text-muted-foreground text-center">
                                    Shell terminal interface will be displayed here.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : ( // Fallback for any unhandled tab, though all should be covered
                 <div className="h-full flex items-center justify-center">
                    <p>Select a tab from the sidebar.</p>
                </div>
            )}
          </div>
        </div>
        
        {showBottomConsole && (
          <div className="h-[200px] md:h-[250px] p-4 pt-0">
            <ConsoleOutput logs={props.logs} />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
