
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/codepilot/main-layout';
import type { AgentType, FileNode } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFileSystem } from '@/context/FileSystemContext';
import { useLogs, type LogEntry } from '@/context/LogContext';
import { usePatchApply } from '@/hooks/use-patch-apply';

export default function CodePilotPage() {
  const { toast } = useToast();
  const { root: fileSystemRoot, getFile, updateFile, initializeFileSystem } = useFileSystem();
  const { addLog: addLogEntry } = useLogs(); 
  const { applyDirectPatch, applyDiffPatch } = usePatchApply();

  const [repoUrl, setRepoUrl] = useState<string>('');
  const [currentGitBranch, setCurrentGitBranch] = useState<string>('main'); // Added for "Save to GitHub"
  const [token, setToken] = useState<string>('');
  const [isCloned, setIsCloned] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [instruction, setInstruction] = useState<string>(''); 
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>('developer'); 
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState<boolean>(false);

  const addLog = useCallback((logEntry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    addLogEntry(logEntry);
    if (logEntry.source === 'error') {
      toast({
        title: "Error",
        description: logEntry.message,
        variant: "destructive",
      });
    }
  }, [addLogEntry, toast]);

  const handleClone = async () => {
    if (!repoUrl) {
      addLog({ message: "Repository URL cannot be empty.", source: 'error' });
      return;
    }
    addLog({ message: `Cloning repository: ${repoUrl}...`, source: 'git' });
    try {
      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone', repoUrl, token }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Clone failed with status ${response.status}`);
      }
      
      if (data.files && typeof data.files === 'object' && Object.keys(data.files).length > 0) {
        initializeFileSystem(data.files);
        addLog({ message: data.message || `Repository cloned. ${Object.keys(data.files).length} files listed.`, source: 'success'});
      } else if (data.message) {
         initializeFileSystem({}); 
         addLog({ message: data.message, source: 'success'});
      } else {
        initializeFileSystem({});
        addLog({ message: 'Repository cloned, but no file data received to populate file system.', source: 'success'});
      }

      setIsCloned(true);
      setSelectedFile(null); 
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog({ message: `Error cloning repository: ${errorMsg}`, source: 'error' });
      setIsCloned(false);
    }
  };

  const handlePull = async () => {
    if (!isCloned) {
      addLog({ message: "No repository cloned to pull from.", source: 'error' });
      return;
    }
    addLog({ message: 'Pulling latest changes from remote... (Mocked - no actual pull yet)', source: 'git' });
    // TODO: Implement actual pull logic via /api/git.
    // This would involve fetching changes and updating FileSystemContext.
    // For now, it's a placeholder.
    setTimeout(() => {
      addLog({ message: 'Mock pull complete. File system not updated.', source: 'info' });
    }, 1000);
  };

  const handleStageAll = () => addLog({ message: 'Staging all changes... (Mocked - no actual staging yet)', source: 'info'});
  
  const handleCommitAndPush = async (commitMessage: string) => {
    if (!isCloned) {
      addLog({ message: "No repository cloned to commit/push to.", source: 'error' });
      return;
    }
    if (!commitMessage.trim()) {
        addLog({ message: "Commit message cannot be empty.", source: 'error' });
        return;
    }
    addLog({ message: `Committing with message: "${commitMessage}" and pushing...`, source: 'git' });

    const filesToCommit: { path: string, content: string }[] = [];
    function collectFiles(node: FileNode, currentPath: string) { // currentPath is not used, node.path is absolute
        if (node.type === 'file') {
            const relativePath = node.path.startsWith('/') ? node.path.substring(1) : node.path;
            filesToCommit.push({ path: relativePath, content: node.content || '' });
        } else if (node.children) {
            node.children.forEach(child => collectFiles(child, child.path)); // Pass child.path
        }
    }

    if (fileSystemRoot.children) { 
        fileSystemRoot.children.forEach(child => collectFiles(child, child.path));
    }
    
    if (filesToCommit.length === 0) {
        addLog({ message: "No files found in the workspace to commit. Ensure files are saved.", source: "info"});
    }

    try {
        const response = await fetch('/api/git', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'commit_and_push', 
                commitMessage, 
                files: filesToCommit,
                token,
                branch: currentGitBranch, // Send current branch for push
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Commit & Push failed with status ${response.status}`);
        }
        addLog({ message: data.message || 'Changes committed and pushed successfully.', source: 'success'});
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog({ message: `Error committing/pushing: ${errorMsg}`, source: 'error'});
    }
  };

  const handleFileSelect = useCallback((file: FileNode) => {
    setSelectedFile(file); // file is now a FileNode object
    if (file.type === 'file') {
        addLog({ message: `Selected file: ${file.path}`, source: 'info' });
    } else {
        addLog({ message: `Selected folder: ${file.path}`, source: 'info' });
    }
  }, [addLog]);
  

  const handleSubmitInstructionToAgentPanel = () => {
    if (!selectedAgent) {
      addLog({ message: "Please select an agent first (from Agent Panels).", source: "error"});
      return;
    }
    if (!instruction.trim()) {
      addLog({ message: "Instruction for Agent Panel cannot be empty.", source: "error"});
      return;
    }
    addLog({ message: `Instruction submitted to ${selectedAgent} agent (from Agent Panel): "${instruction}"`, source: 'agent'});
    setIsSubmittingInstruction(true);
    setTimeout(() => {
        addLog({ message: `Mock response from ${selectedAgent} agent for: "${instruction}"`, source: 'agent'});
        setIsSubmittingInstruction(false);
        setInstruction(""); 
    }, 1500);
  };

  return (
    <MainLayout
      repoUrl={repoUrl}
      setRepoUrl={setRepoUrl}
      currentGitBranch={currentGitBranch} // Pass currentGitBranch
      setToken={setToken}
      token={token}
      isCloned={isCloned}
      onClone={handleClone}
      onPull={handlePull} 
      onStageAll={handleStageAll}
      onCommit={handleCommitAndPush}
      // onPush is part of handleCommitAndPush
      fileSystemRoot={fileSystemRoot}
      selectedFile={selectedFile}
      onFileSelect={handleFileSelect}
      instruction={instruction} 
      setInstruction={setInstruction} 
      selectedAgent={selectedAgent} 
      setSelectedAgent={setSelectedAgent} 
      isSubmittingInstruction={isSubmittingInstruction} 
      submitInstruction={handleSubmitInstructionToAgentPanel} 
      applyPatch={applyDiffPatch} 
    />
  );
}
