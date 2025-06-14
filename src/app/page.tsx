
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/codepilot/main-layout';
import type { AgentType, FileNode } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFileSystem } from '@/context/FileSystemContext';
import { useLogs } from '@/context/LogContext';
import { usePatchApply } from '@/hooks/use-patch-apply';

export default function CodePilotPage() {
  const { toast } = useToast();
  const { root: fileSystemRoot, getFile, updateFile, initializeFileSystem } = useFileSystem();
  const { addLog: addLogEntry } = useLogs(); // logs state is now managed by LogContext directly in components
  const { applyDirectPatch, applyDiffPatch } = usePatchApply();

  const [repoUrl, setRepoUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isCloned, setIsCloned] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [instruction, setInstruction] = useState<string>(''); // Kept for potential non-chat instruction input
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>('developer'); // For AgentPanels
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState<boolean>(false); // For AgentPanels

  const addLog = useCallback((message: string, type: LogEntry['source'] = 'info') => {
    addLogEntry({ message, source: type });
    if (type === 'error') {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [addLogEntry, toast]);

  const handleClone = async () => {
    if (!repoUrl) {
      addLog("Repository URL cannot be empty.", 'error');
      return;
    }
    addLog(`Cloning repository: ${repoUrl}...`, 'git');
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
      
      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        const filesToInitialize = data.files.reduce((acc: Record<string, string>, filePath: string) => {
          acc[filePath] = ""; // Initialize with empty content, or fetch if backend provides it
          return acc;
        }, {});
        initializeFileSystem(filesToInitialize);
        addLog(data.message || `Repository cloned. ${data.files.length} files listed. File content will be fetched on demand or is empty.`, 'success');
      } else if (data.message) {
         initializeFileSystem({}); // Initialize with empty if no files are explicitly returned
         addLog(data.message, 'success');
      } else {
        initializeFileSystem({});
        addLog('Repository cloned, but no file data received to populate file system.', 'success');
      }

      setIsCloned(true);
      setSelectedFile(null); // Reset selected file
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Error cloning repository: ${errorMsg}`, 'error');
      setIsCloned(false);
    }
  };

  const handlePull = async () => {
    if (!isCloned) {
      addLog("No repository cloned to pull from.", 'error');
      return;
    }
    addLog('Pulling latest changes from remote... (Mocked - no actual pull yet)', 'git');
    // TODO: Implement actual pull logic via /api/git.
    // This would involve fetching changes and updating FileSystemContext.
    // For now, it's a placeholder.
    setTimeout(() => {
      addLog('Mock pull complete. File system not updated.', 'info');
    }, 1000);
  };

  const handleStageAll = () => addLog('Staging all changes... (Mocked - no actual staging yet)', 'info');
  
  const handleCommitAndPush = async (commitMessage: string) => {
    if (!isCloned) {
      addLog("No repository cloned to commit/push to.", 'error');
      return;
    }
    if (!commitMessage.trim()) {
        addLog("Commit message cannot be empty.", 'error');
        return;
    }
    addLog(`Committing with message: "${commitMessage}" and pushing...`, 'git');

    const filesToCommit: { path: string, content: string }[] = [];
    function collectFiles(node: FileNode, currentPath: string) {
        if (node.type === 'file') {
            // Ensure path is relative to repo root (remove leading '/')
            const relativePath = node.path.startsWith('/') ? node.path.substring(1) : node.path;
            filesToCommit.push({ path: relativePath, content: node.content || '' });
        } else if (node.children) {
            node.children.forEach(child => collectFiles(child, (currentPath === "/" ? "" : currentPath) + "/" + child.name));
        }
    }
    if (fileSystemRoot.children) { // Start collecting from children of the root
        fileSystemRoot.children.forEach(child => collectFiles(child, "/"));
    }
    
    if (filesToCommit.length === 0) {
        addLog("No files found in the workspace to commit. Ensure files are saved.", "info");
        // return; // Or allow empty commit if backend/git supports it
    }

    try {
        const response = await fetch('/api/git', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'commit_and_push', 
                commitMessage, 
                files: filesToCommit,
                token 
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Commit & Push failed with status ${response.status}`);
        }
        addLog(data.message || 'Changes committed and pushed successfully.', 'success');
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog(`Error committing/pushing: ${errorMsg}`, 'error');
    }
  };

  const handleFileSelect = useCallback((file: FileNode) => {
    setSelectedFile(file);
    if (file.type === 'file') {
        addLog(`Selected file: ${file.path}`, 'info');
    } else {
        addLog(`Selected folder: ${file.path}`, 'info');
    }
  }, [addLog]);

  // This handler is no longer needed for the primary FileEditor in Canvas,
  // as it manages its own state and saves directly.
  // It might be kept if other CodeEditor instances need it.
  // const handleEditorContentChange = useCallback((newContent: string) => {
  //   if (selectedFile && selectedFile.type === 'file') {
  //     updateFile(selectedFile.path, newContent);
  //     setSelectedFile(prev => prev ? { ...prev, content: newContent } : null);
  //   }
  // }, [selectedFile, updateFile]);
  

  const handleSubmitInstructionToAgentPanel = () => {
    if (!selectedAgent) {
      addLog("Please select an agent first (from Agent Panels).", "error");
      return;
    }
    if (!instruction.trim()) {
      addLog("Instruction for Agent Panel cannot be empty.", "error");
      return;
    }
    addLog(`Instruction submitted to ${selectedAgent} agent (from Agent Panel): "${instruction}"`, 'agent');
    setIsSubmittingInstruction(true);
    // This is a mock submission for the AgentPanels.
    // Real submission logic is in InstructionChat for the chat tab.
    setTimeout(() => {
        addLog(`Mock response from ${selectedAgent} agent for: "${instruction}"`, 'agent');
        setIsSubmittingInstruction(false);
        setInstruction(""); // Clear instruction after mock submission
    }, 1500);
  };

  return (
    <MainLayout
      repoUrl={repoUrl}
      setRepoUrl={setRepoUrl}
      token={token}
      setToken={setToken}
      isCloned={isCloned}
      onClone={handleClone}
      onPull={handlePull} 
      onStageAll={handleStageAll}
      onCommit={handleCommitAndPush}
      onPush={() => { /* onPush is part of handleCommitAndPush */ }}
      fileSystemRoot={fileSystemRoot}
      selectedFile={selectedFile}
      onFileSelect={handleFileSelect}
      // onEditorChange is removed as FileEditor in Canvas handles its own state
      instruction={instruction} // For AgentPanels
      setInstruction={setInstruction} // For AgentPanels
      selectedAgent={selectedAgent} // For AgentPanels
      setSelectedAgent={setSelectedAgent} // For AgentPanels
      isSubmittingInstruction={isSubmittingInstruction} // For AgentPanels
      submitInstruction={handleSubmitInstructionToAgentPanel} // For AgentPanels
      addLog={addLog} // For general logging from MainLayout if needed
      applyPatch={applyDiffPatch} // Pass one of the patch apply functions
    />
  );
}
