
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
import FileExplorer from './file-explorer'; // Updated import path
import FileEditor from './file-editor'; // New FileEditor for Canvas
import { CodeEditor } from './code-editor'; // Existing CodeEditor for preview/other uses
import { ConsoleOutput } from './console-output'; 
import { AgentPanels } from './agent-panels';
import { CanvasGitActions } from './canvas-git-actions';
import ProjectConsole from './project-console'; 
import type { AgentType, FileNode as FileSystemRootType, FileNode } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
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

  // File System State from Page
  fileSystemRoot: FileSystemRootType; 
  selectedFile: FileNode | null; // Changed from selectedFilePath and currentFileContent
  onFileSelect: (file: FileNode) => void; // Changed to pass FileNode
  onEditorChange: (content: string) => void; // For FileEditor in Canvas
  
  // Instruction & Agent State
  instruction: string; 
  setInstruction: (instruction: string) => void; 
  selectedAgent: AgentType | null;
  setSelectedAgent: (agent: AgentType | null) => void;
  isSubmittingInstruction: boolean; 
  submitInstruction: () => void; 
  
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent' | 'system' | 'git' | 'shell') => void;
  applyPatch: (filePath: string, patchString: string) => void; // Assuming diff patch for now
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
          (isAgentsTabActive || isGitTabActive || isCanvasTabActive || isOthersTabActive || isChatTabActive) && "pb-4", 
          isChatTabActive && "p-0 md:p-2", 
          isOthersTabActive && "p-0 md:p-2" 
        )}>
          
          <div className={cn(
              "md:col-span-1 flex-col gap-4 h-full overflow-y-auto",
              showLeftColumnContent ? "flex" : "hidden md:flex",
              (isAgentsTabActive || isChatTabActive || isOthersTabActive) && "hidden", 
              isCanvasTabActive && "flex" 
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
                    onFileSelect={props.onFileSelect}
                    selectedFilePath={props.selectedFile?.path || null}
                />
              )}
            </div>


          <div className={cn(
            "flex flex-col h-full overflow-y-auto",
            (isAgentsTabActive || isChatTabActive || isOthersTabActive) ? "md:col-span-3" : 
            (isCanvasTabActive || isGitTabActive) ? "md:col-span-2" : 
            "md:col-span-2", 
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
                            onFileSelect={props.onFileSelect}
                            selectedFilePath={props.selectedFile?.path || null}
                          />
                    </div>
                    <div className="flex-grow basis-1/2 min-h-0">
                        {/* Using existing CodeEditor for read-only preview */}
                        <CodeEditor
                            filePath={props.selectedFile?.path || null}
                            content={props.selectedFile?.content || ''}
                            setContent={() => {}} // No-op as it's read-only here
                            readOnly={true}
                            title={props.selectedFile ? undefined : "Select a file to preview"} // Title managed by CodeEditor
                        />
                    </div>
                </div>
            ) : isCanvasTabActive ? (
                <div className="h-full flex flex-col gap-4">
                    <div className="flex-grow min-h-0">
                        {/* Using new FileEditor for editing */}
                        <FileEditor
                            file={props.selectedFile}
                            onChange={props.onEditorChange}
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
                 <div className="h-full w-full"> 
                    <ProjectConsole />
                </div>
            ) : ( 
                 <div className="h-full flex items-center justify-center">
                    <p>Select a tab from the sidebar.</p>
                </div>
            )}
          </div>
        </div>
        
        {showBottomConsole && (
          <div className="h-[200px] md:h-[250px] p-4 pt-0">
            <ConsoleOutput />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
