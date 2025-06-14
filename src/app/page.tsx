
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
  const { root: fileSystemRoot, getFile, updateFileDetails, initializeFileSystem } = useFileSystem();
  const { addLog: addLogEntry } = useLogs(); 
  const { applyDirectPatch, applyDiffPatch } = usePatchApply();

  const [repoUrl, setRepoUrl] = useState<string>('');
  const [currentGitBranch, setCurrentGitBranch] = useState<string>('main');
  const [token, setToken] = useState<string>(''); // User-provided PAT for initial clone if needed
  const [isCloned, setIsCloned] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [instruction, setInstruction] = useState<string>(''); 
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null); // No longer used for chat, but kept for AgentPanels if needed
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState<boolean>(false); // For AgentPanels, if used

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
        body: JSON.stringify({ action: 'clone', repoUrl, token, branch: currentGitBranch }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || `Clone failed with status ${response.status}`);
      }
      
      if (data.files && typeof data.files === 'object') {
        initializeFileSystem(data.files); // data.files should be Record<string, { content: string, sha?: string }>
        addLog({ message: data.message || `Repository cloned. ${Object.keys(data.files).length} files listed.`, source: 'success'});
        setIsCloned(true);
        setSelectedFile(null); 
      } else {
         initializeFileSystem({}); 
         addLog({ message: data.message || 'Clone successful but no files listed from initial clone operation.', source: 'success'});
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
    addLog({ message: 'Pulling latest changes (simulated, re-cloning)...', source: 'git' });
    // For MVP, pull can re-trigger clone logic or fetch all files again.
    // A true pull would involve more complex git operations.
    // For now, let's just re-initialize by calling clone's logic.
    await handleClone(); 
  };
  
  const handleStageAll = () => {
    addLog({ message: 'Staging all changes (conceptually handled by "Save to GitHub" for individual files).', source: 'info'});
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

    addLog({ message: `Saving all modified files to GitHub with base message: "${commitMessage}"...`, source: 'git' });

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

    const filesToSave: { path: string, content: string, sha?: string }[] = [];
    function collectFiles(node: FileNode) {
      if (node.type === 'file') { 
        const relativePath = node.path.startsWith('/') ? node.path.substring(1) : node.path;
        
        if (relativePath && node.content !== undefined) { 
           filesToSave.push({ path: relativePath, content: node.content, sha: node.sha });
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
        const response = await fetch('/api/git/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner,
            repo: repoName,
            path: file.path,
            content: file.content,
            message: `${commitMessage} (file: ${file.path})`,
            branch: currentGitBranch,
            ...(file.sha ? { sha: file.sha } : {}),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          allSuccessful = false;
          addLog({ message: `Failed to save ${file.path}: ${data.error || data.details || `Status ${response.status}`}`, source: 'error' });
        } else {
          addLog({ message: `Successfully saved ${file.path} to GitHub. Commit: ${data.githubResponse?.commit?.sha?.substring(0,7) || 'N/A'}`, source: 'success' });
          // Update SHA in FileSystemContext after successful save
          if (data.githubResponse?.content?.sha) {
            updateFileDetails(file.path, { sha: data.githubResponse.content.sha });
            // If the currently selected file was this one, update its state too
            if (selectedFile && selectedFile.path === file.path) {
              setSelectedFile(prev => prev ? ({...prev, sha: data.githubResponse.content.sha }) : null);
            }
          }
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

  const handleFileSelect = useCallback(async (fileNode: FileNode) => {
    addLog({ message: `Selected ${fileNode.type}: ${fileNode.path}`, source: 'info' });

    if (fileNode.type === 'file') {
      if (!repoUrl) {
        addLog({ source: 'error', message: 'Repository URL not set. Cannot fetch file content from GitHub.' });
        setSelectedFile(fileNode); // Select the file from context, even if we can't fetch
        return;
      }

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
        addLog({ source: 'error', message: `Invalid Repository URL: ${e instanceof Error ? e.message : String(e)}` });
        setSelectedFile(fileNode);
        return;
      }

      if (!owner || !repoName) {
        addLog({ source: 'error', message: 'Could not parse owner and repository name from URL.' });
        setSelectedFile(fileNode);
        return;
      }
      
      const filePathInRepo = fileNode.path.startsWith('/') ? fileNode.path.substring(1) : fileNode.path;
      addLog({ source: 'git', message: `Fetching content for ${filePathInRepo} from branch ${currentGitBranch}...` });

      try {
        const queryParams = new URLSearchParams({
          owner,
          repo: repoName,
          path: filePathInRepo,
          branch: currentGitBranch,
        }).toString();

        const response = await fetch(`/api/git/get-file?${queryParams}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to fetch file from GitHub (${response.status})`);
        }

        updateFileDetails(fileNode.path, { content: data.content, sha: data.sha });
        setSelectedFile({ ...fileNode, content: data.content, sha: data.sha });
        toast({ title: "File Loaded", description: `${fileNode.name} loaded from GitHub.` });
        addLog({ source: 'success', message: `Content for ${fileNode.name} fetched successfully from GitHub.` });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog({ source: 'error', message: `Error fetching file ${fileNode.name} from GitHub: ${errorMsg}` });
        setSelectedFile(fileNode); // Still select the file, but with potentially stale/no content from context
        toast({
          title: "Error Loading File",
          description: `Could not load ${fileNode.name} from GitHub. Displaying local version. ${errorMsg}`,
          variant: "destructive",
        });
      }
    } else { // It's a folder
      setSelectedFile(fileNode);
    }
  }, [addLog, repoUrl, currentGitBranch, updateFileDetails, toast]);
  
  const handleSubmitInstructionToAgentPanel = () => {
    // This function is for the AgentPanels (developer/qa config), not the main chat.
    if (!selectedAgent) { // selectedAgent is still used by AgentPanels
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
      currentGitBranch={currentGitBranch} 
      token={token} 
      setToken={setToken}
      isCloned={isCloned}
      onClone={handleClone}
      onPull={handlePull} 
      onStageAll={handleStageAll}
      onCommit={handleCommitAndPush}
      fileSystemRoot={fileSystemRoot}
      selectedFile={selectedFile}
      onFileSelect={handleFileSelect}
      instruction={instruction} // For AgentPanels
      setInstruction={setInstruction}  // For AgentPanels
      selectedAgent={selectedAgent} // For AgentPanels
      setSelectedAgent={setSelectedAgent} // For AgentPanels
      isSubmittingInstruction={isSubmittingInstruction}  // For AgentPanels
      submitInstruction={handleSubmitInstructionToAgentPanel}  // For AgentPanels
      applyPatch={applyDiffPatch} 
    />
  );
}

