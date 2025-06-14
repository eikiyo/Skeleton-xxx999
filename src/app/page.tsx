
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
  const { root: fileSystemRoot, getFile, updateFile: updateFileInContext, initializeFileSystem } = useFileSystem();
  const { addLog: addLogEntry } = useLogs(); 
  const { applyDirectPatch, applyDiffPatch } = usePatchApply();

  const [repoUrl, setRepoUrl] = useState<string>('');
  const [currentGitBranch, setCurrentGitBranch] = useState<string>('main');
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
      const response = await fetch('/api/git', { // This still uses /api/git for clone
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone', repoUrl, token, branch: currentGitBranch }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Clone failed with status ${response.status}`);
      }
      
      if (data.files && typeof data.files === 'object') {
        initializeFileSystem(data.files);
        addLog({ message: data.message || `Repository cloned. ${Object.keys(data.files).length} files listed.`, source: 'success'});
        setIsCloned(true);
        setSelectedFile(null); 
      } else {
         initializeFileSystem({}); 
         addLog({ message: data.message || 'Clone successful but no files listed.', source: 'success'});
         setIsCloned(true);
         setSelectedFile(null);
      }
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
    addLog({ message: 'Pulling latest changes from remote... (Attempting real pull)', source: 'git' });
    try {
       const response = await fetch('/api/git', { // This could use /api/git for pull if implemented there
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull', repoUrl, token, branch: currentGitBranch }), 
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Pull failed with status ${response.status}`);
      }
      if (data.files && typeof data.files === 'object') {
        initializeFileSystem(data.files); // Re-initialize FS with pulled files
        addLog({ message: `Pull successful. ${Object.keys(data.files).length} files updated.`, source: 'success'});
      } else {
        addLog({ message: data.message || 'Pull successful, no file data to update workspace.', source: 'success'});
      }
       setSelectedFile(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog({ message: `Error pulling repository: ${errorMsg}`, source: 'error'});
    }
  };

  const handleStageAll = () => {
    // Staging is now implicit if using /api/git/save-file for each modified file
    // Or if /api/git commit_and_push is used, it stages everything.
    // For now, this can be a no-op or log an informational message.
    addLog({ message: 'Staging all changes (conceptually, all modified files will be part of the next "Commit & Push" if saved individually).', source: 'info'});
  }
  
  const handleCommitAndPush = async (commitMessage: string) => {
    if (!isCloned) {
      addLog({ message: "No repository cloned to commit/push to.", source: 'error' });
      return;
    }
    if (!commitMessage.trim()) {
      addLog({ message: "Commit message cannot be empty.", source: 'error' });
      return;
    }
    if (!repoUrl) {
      addLog({ message: "Repository URL is not set. Cannot determine owner/repo.", source: 'error' });
      return;
    }

    addLog({ message: `Preparing to save files to GitHub with base message: "${commitMessage}"...`, source: 'git' });

    let owner, repoName;
    try {
      const url = new URL(repoUrl.replace(/\.git$/, ''));
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        owner = pathParts[pathParts.length - 2];
        repoName = pathParts[pathParts.length - 1];
      } else {
        const sshMatch = repoUrl.match(/[:/]([\w-]+)\/([\w-]+)(\.git)?$/);
        if (sshMatch && sshMatch.length >= 3) {
          owner = sshMatch[1];
          repoName = sshMatch[2];
        } else {
          throw new Error("Could not parse owner/repo from URL.");
        }
      }
    } catch (e) {
      addLog({ message: `Invalid Repository URL for saving files: ${e instanceof Error ? e.message : String(e)}`, source: 'error' });
      return;
    }

    if (!owner || !repoName) {
      addLog({ message: "Could not parse owner and repository name from the URL for saving files.", source: 'error' });
      return;
    }

    const filesToSave: { path: string, content: string }[] = [];
    function collectFiles(node: FileNode) {
      if (node.type === 'file' && node.content !== undefined) { // Only include files with content
        const relativePath = node.path.startsWith('/') ? node.path.substring(1) : node.path;
        if (relativePath && !relativePath.startsWith('/')) { // Ensure it's a relative path within the repo
           filesToSave.push({ path: relativePath, content: node.content });
        }
      } else if (node.type === 'folder' && node.children) {
        node.children.forEach(collectFiles);
      }
    }

    if (fileSystemRoot.children) {
      fileSystemRoot.children.forEach(collectFiles);
    }

    if (filesToSave.length === 0) {
      addLog({ message: "No files with content found in the workspace to save.", source: 'info' });
      return;
    }

    addLog({ message: `Found ${filesToSave.length} file(s) to save to GitHub.`, source: 'git' });

    let allSuccessful = true;
    for (const file of filesToSave) {
      addLog({ message: `Saving ${file.path} to GitHub...`, source: 'git' });
      try {
        // SHA is not sent; this creates/updates the file. GitHub API handles this.
        // Each save will be its own commit.
        const response = await fetch('/api/git/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner,
            repo: repoName,
            path: file.path,
            content: file.content,
            message: `${commitMessage} (file: ${file.path})`, // Individual commit message
            branch: currentGitBranch,
            // token is handled by the backend API route via GITHUB_TOKEN env var
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          allSuccessful = false;
          addLog({ message: `Failed to save ${file.path}: ${data.error || `Status ${response.status}`}`, source: 'error' });
        } else {
          addLog({ message: `Successfully saved ${file.path} to GitHub. Commit: ${data.commit?.sha?.substring(0,7) || 'N/A'}`, source: 'success' });
        }
      } catch (error) {
        allSuccessful = false;
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog({ message: `Error saving ${file.path}: ${errorMsg}`, source: 'error' });
      }
    }

    if (allSuccessful) {
      addLog({ message: 'All specified files successfully saved to GitHub.', source: 'success' });
    } else {
      addLog({ message: 'Some files failed to save to GitHub. Check logs for details.', source: 'error' });
    }
  };


  const handleFileSelect = useCallback((file: FileNode) => {
    setSelectedFile(file);
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
    // This function's purpose seems to be for a different instruction input mechanism
    // than the main chat. For now, it's a mock for the AgentPanels.
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
      currentGitBranch={currentGitBranch} 
      token={token} // Token is used by /api/git for clone, not directly by save-file frontend
      setToken={setToken}
      isCloned={isCloned}
      onClone={handleClone}
      onPull={handlePull} 
      onStageAll={handleStageAll}
      onCommit={handleCommitAndPush}
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

