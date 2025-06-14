
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/codepilot/main-layout';
import type { AgentType, FileNode } from '@/types';
import { useToast } from "@/hooks/use-toast";
// DiffMatchPatch is now used within usePatchApply hook
// import DiffMatchPatch from 'diff-match-patch';
import { useFileSystem } from '@/context/FileSystemContext';
import { useLogs } from '@/context/LogContext';
import { usePatchApply } from '@/hooks/use-patch-apply'; // Import the new hook

export default function CodePilotPage() {
  const { toast } = useToast();
  const { root: fileSystemRoot, getFile, updateFile, initializeFileSystem } = useFileSystem();
  const { logs, addLog: addLogEntry } = useLogs();
  const { applyDirectPatch, applyDiffPatch } = usePatchApply(); // Use the patch apply hook

  // Git State
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isCloned, setIsCloned] = useState<boolean>(false);

  // File System State
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  // Instruction & Agent State
  const [instruction, setInstruction] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>('developer');
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState<boolean>(false);
  
  const addLog = useCallback((message: string, type: LogEntry['source'] = 'info') => {
    addLogEntry({ message, source: type }); // Ensure this matches new LogEntry structure
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
      
      // Assuming data.files is Record<string, string>
      // If data.files is string[] (list of paths), we'd need to fetch content for each or adjust backend
      // For now, assuming backend could return flat file structure or initializeFileSystem handles structure creation
      if (data.files && typeof data.files === 'object' && !Array.isArray(data.files)) {
        initializeFileSystem(data.files as Record<string, string>);
         addLog(data.message || 'Repository cloned successfully and file system initialized.', 'success');
      } else if (data.files && Array.isArray(data.files)) {
        // If backend returns list of paths, create empty files or fetch content
        const emptyFiles = data.files.reduce((acc, path) => {
            acc[path] = ""; // Placeholder content
            return acc;
        }, {} as Record<string,string>);
        initializeFileSystem(emptyFiles);
        addLog(data.message || `Repository cloned. ${data.files.length} files/folders listed. Content needs fetching.`, 'success');
      } else {
         initializeFileSystem({}); // Initialize with empty if no files returned
         addLog(data.message || 'Repository cloned, but no file data received to populate file system.', 'success');
      }

      setIsCloned(true);
      setSelectedFile(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Error cloning repository: ${errorMsg}`, 'error');
      setIsCloned(false); // Ensure isCloned is false on error
    }
  };

  const handlePull = async () => {
    if (!isCloned) {
      addLog("No repository cloned to pull from.", 'error');
      return;
    }
    addLog('Pulling latest changes from remote...', 'git');
    // TODO: Implement actual pull logic with /api/git if backend supports 'pull'
    // For now, just a log message
    setTimeout(() => {
      addLog('Repository pulled successfully. (Mocked - files not updated)', 'success');
      // Potentially re-fetch file list or update file system if pull brings changes
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

    // Gather all files from the FileSystemContext to send to backend
    // This is a simplified approach; a real Git client would track changes.
    const filesToCommit: { path: string, content: string }[] = [];
    function collectFiles(node: FileNode) {
        if (node.type === 'file') {
            // Remove leading '/' if root path is '/'
            const nodePath = node.path.startsWith('/') ? node.path.substring(1) : node.path;
            filesToCommit.push({ path: nodePath, content: node.content || '' });
        } else if (node.children) {
            node.children.forEach(collectFiles);
        }
    }
    if (fileSystemRoot.children) {
        fileSystemRoot.children.forEach(collectFiles);
    }
    
    if (filesToCommit.length === 0) {
        addLog("No files found in the workspace to commit.", "info");
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
                token // Send token for authentication
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
    setSelectedFile(file); // Now sets the entire FileNode object
    addLog(`Selected: ${file.path} (${file.type})`, 'info');
  }, [addLog]);

  const handleEditorContentChange = useCallback((newContent: string) => {
    if (selectedFile && selectedFile.type === 'file') {
      updateFile(selectedFile.path, newContent);
      // Keep local selectedFile state in sync with context for editor responsiveness
      setSelectedFile(prev => prev ? { ...prev, content: newContent } : null);
    }
  }, [selectedFile, updateFile]);
  

  const handleSubmitInstruction = () => {
    if (!selectedAgent) {
      addLog("Please select an agent first.", "error");
      return;
    }
    if (!instruction.trim()) {
      addLog("Instruction cannot be empty.", "error");
      return;
    }
    // This log is now handled by InstructionChat component via LogContext
    // addLog(`Instruction submitted to ${selectedAgent} agent: "${instruction}"`, 'agent');
    setIsSubmittingInstruction(true);
    // Actual dispatch logic is in InstructionChat which calls /api/dispatch-instruction
    // This submitInstruction prop might be vestigial if InstructionChat is self-contained.
    // For now, simulate completion for any external submission button if it existed
    setTimeout(() => setIsSubmittingInstruction(false), 500); 
  };

  // Example of how applyDiffPatch might be called (e.g., from an agent response)
  // const handleApplyDiffPatch = (filePath: string, patchStr: string) => {
  //   applyDiffPatch(filePath, patchStr);
  // };

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
      onCommit={handleCommitAndPush} // Updated to handleCommitAndPush
      onPush={() => { /* onPush is part of handleCommitAndPush */ }}
      fileSystemRoot={fileSystemRoot}
      selectedFile={selectedFile} // Pass the full FileNode
      onFileSelect={handleFileSelect}
      onEditorChange={handleEditorContentChange} // Pass new handler for FileEditor
      instruction={instruction}
      setInstruction={setInstruction}
      selectedAgent={selectedAgent}
      setSelectedAgent={setSelectedAgent}
      isSubmittingInstruction={isSubmittingInstruction}
      submitInstruction={handleSubmitInstruction}
      addLog={addLog}
      applyPatch={applyDiffPatch} // Or applyDirectPatch, depending on agent output format
    />
  );
}
