
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
import { Settings, Bot, GitBranch, Files, LayoutGrid, MessageSquare, Edit3, Layers } from 'lucide-react'; // Added Layers
import { FileExplorer } from './file-explorer';
import { GitControls } from './git-controls';
import { CodeEditor } from './code-editor';
import { ConsoleOutput } from './console-output';
import { InstructionInput } from './instruction-input';
import { AgentPanels } from './agent-panels';
import { CanvasGitActions } from './canvas-git-actions';
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
  const isChatTabActive = activeSidebarTab === 'chat';
  const isGitTabActive = activeSidebarTab === 'git';
  const isCanvasTabActive = activeSidebarTab === 'canvas';
  const isOthersTabActive = activeSidebarTab === 'others';

  const showConsole = !isChatTabActive && !isAgentsTabActive && !isGitTabActive && !isCanvasTabActive && !isOthersTabActive;
  const showLeftColumnContent = !isChatTabActive && !isAgentsTabActive && !isOthersTabActive;


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
          (isChatTabActive || isAgentsTabActive || isGitTabActive || isCanvasTabActive || isOthersTabActive) && "pb-4" 
        )}>
          {/* Left Column (Sidebar Content) */}
          {showLeftColumnContent && (
            <div className={cn(
              "md:col-span-1 flex flex-col gap-4 h-full overflow-y-auto",
               // This condition will hide the left column for Chat, Agents, and Others tabs.
            )}>
              {isGitTabActive && (
                <GitControls
                  repoUrl={props.repoUrl}
                  setRepoUrl={props.setRepoUrl}
                  token={props.token}
                  setToken={props.setToken}
                  onClone={props.onClone}
                  isCloned={props.isCloned}
                />
              )}
              {(isGitTabActive || isCanvasTabActive) && (
                <Card className="h-full shadow-sm flex-grow">
                  <FileExplorer
                    files={props.files}
                    selectedFilePath={props.selectedFilePath}
                    onFileSelect={props.onFileSelect}
                  />
                </Card>
              )}
            </div>
          )}

          {/* Center Column (Agent Panels / Code Editor / Chat Interface / Canvas / Others) */}
          <div className={cn(
            "flex flex-col h-full overflow-y-auto",
            (!showLeftColumnContent || isChatTabActive || isAgentsTabActive || isOthersTabActive) ? "md:col-span-3" : "md:col-span-2"
          )}>
            {isAgentsTabActive ? (
                <AgentPanels
                  selectedAgent={props.selectedAgent}
                  setSelectedAgent={props.setSelectedAgent}
                  addLog={props.addLog}
                />
            ) : isChatTabActive ? (
                <>
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
            ) : isCanvasTabActive ? (
                <div className="h-full flex flex-col">
                    <div className="flex-grow min-h-0">
                        <CodeEditor
                            filePath={props.selectedFilePath}
                            content={props.currentFileContent}
                            setContent={props.setFileContent}
                            title="Canvas"
                        />
                    </div>
                    <div className="shrink-0 mt-4">
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
            ) : ( // This covers 'git' tab for the center panel
                 <div className="h-full">
                    <CodeEditor
                      filePath={props.selectedFilePath}
                      content={props.currentFileContent}
                      setContent={props.setFileContent}
                      title={isGitTabActive ? "Project Structure" : undefined}
                    />
                </div>
            )}
          </div>
        </div>
        
        {showConsole && (
          <div className="h-[200px] md:h-[250px] p-4 pt-0">
            <ConsoleOutput logs={props.logs} />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
