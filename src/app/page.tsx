
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/codepilot/main-layout';
import type { AgentType, FileNode } from '@/types'; // FileSystem removed, FileNode used
import { useToast } from "@/hooks/use-toast";
import DiffMatchPatch from 'diff-match-patch';
import { useFileSystem } from '@/context/FileSystemContext';
import { useLogs } from '@/context/LogContext';

export default function CodePilotPage() {
  const { toast } = useToast();
  const { root: fileSystemRoot, getFile, updateFile, initializeFileSystem } = useFileSystem();
  const { logs, addLog: addLogEntry } = useLogs();

  // Git State
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isCloned, setIsCloned] = useState<boolean>(false);

  // File System State (now primarily managed by context, local state for selection)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFileContent, setCurrentFileContent] = useState<string>('');

  // Instruction & Agent State
  const [instruction, setInstruction] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>('developer');
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState<boolean>(false);
  
  // Wrapper for addLog to match previous signature if needed, or can directly use addLogEntry
  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' | 'agent' | 'system' | 'git' | 'shell' = 'info') => {
    addLogEntry({ message, source: type });
    if (type === 'error') {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [addLogEntry, toast]);


  const handleClone = () => {
    if (!repoUrl) {
      addLog("Repository URL cannot be empty.", 'error');
      return;
    }
    addLog(`Cloning repository: ${repoUrl}... (Mocked)`, 'info');
    setTimeout(() => {
      const mockFiles: Record<string, string> = {
        'README.md': '# My Awesome Project\nThis is a sample README file.',
        'src/index.ts': "console.log('Hello, CodePilot!');",
        'src/app/page.tsx': "// Sample page.tsx content\nexport default function Page() { return <h1>Welcome</h1>; }",
        'package.json': '{ "name": "my-project", "version": "1.0.0" }'
      };
      initializeFileSystem(mockFiles); // Initialize context's file system
      setIsCloned(true);
      setSelectedFilePath(null); 
      setCurrentFileContent('');
      addLog('Repository cloned successfully. (Mocked)', 'success');
    }, 1000);
  };

  const handlePull = () => {
    if (!isCloned) {
      addLog("No repository cloned to pull from.", 'error');
      return;
    }
    addLog('Pulling latest changes from remote... (Mocked)', 'info');
    setTimeout(() => {
      addLog('Repository pulled successfully. (Mocked)', 'success');
    }, 1000);
  };

  const handleStageAll = () => addLog('Staging all changes... (Mocked)', 'info');
  const handleCommit = (message: string) => {
    addLog(`Committing with message: "${message}"... (Mocked)`, 'git');
    // Potentially trigger a push or indicate that push is needed
    addLog('Changes committed. Ready to push. (Mocked)', 'success');
  };
  const handlePush = () => {
    addLog('Pushing changes... (Mocked)', 'git');
     setTimeout(() => {
        addLog('Changes pushed successfully. (Mocked)', 'success');
    }, 1000);
  };


  const handleFileSelect = useCallback((path: string) => {
    setSelectedFilePath(path);
    const fileNode = getFile(path);
    if (fileNode && fileNode.type === 'file') {
      setCurrentFileContent(fileNode.content || '');
    } else {
      setCurrentFileContent(''); // Clear content if folder or not found
    }
    addLog(`Selected file: ${path}`, 'info');
  }, [getFile, addLog]);

  const updateSelectedFileContent = useCallback((newContent: string) => {
    if (selectedFilePath) {
      updateFile(selectedFilePath, newContent);
      setCurrentFileContent(newContent); // Keep local state in sync for editor
    }
  }, [selectedFilePath, updateFile]);
  
  // This function signature matches what CodeEditor expects.
  // It updates context and local state.
  const handleSetFileContentForEditor = useCallback((path: string, newContent: string) => {
    updateFile(path, newContent);
    if (path === selectedFilePath) {
      setCurrentFileContent(newContent);
    }
  }, [updateFile, selectedFilePath]);


  const handleSubmitInstruction = () => {
    if (!selectedAgent) {
      addLog("Please select an agent first.", "error");
      return;
    }
    if (!instruction.trim()) {
      addLog("Instruction cannot be empty.", "error");
      return;
    }
    addLog(`Instruction submitted to ${selectedAgent} agent: "${instruction}"`, 'agent');
    setIsSubmittingInstruction(true);
    // Actual dispatch logic will happen in InstructionChat or AgentPanels
    // For now, simulate completion for any external submission button
    setTimeout(() => setIsSubmittingInstruction(false), 500); 
  };

  const applyPatch = useCallback((patchString: string) => {
    if (!selectedFilePath) {
      addLog("No file selected to apply patch.", "error");
      return;
    }
    const dmp = new DiffMatchPatch();
    const patches = dmp.patch_fromText(patchString);
    const [newText, results] = dmp.patch_apply(patches, currentFileContent);

    if (results.every(result => result === true)) {
      updateSelectedFileContent(newText as string); 
      addLog(`Patch applied successfully to ${selectedFilePath}.`, "success");
    } else {
      addLog(`Failed to apply patch to ${selectedFilePath}. Some hunks may have failed.`, "error");
      results.forEach((result, i) => {
        if (!result) addLog(`Patch hunk ${i+1} failed.`, "error");
      });
    }
  }, [selectedFilePath, currentFileContent, addLog, updateSelectedFileContent]);

  // Effect to update currentFileContent if the selected file's content changes in context
  useEffect(() => {
    if (selectedFilePath) {
      const fileNode = getFile(selectedFilePath);
      if (fileNode && fileNode.type === 'file') {
        if (fileNode.content !== currentFileContent) {
          setCurrentFileContent(fileNode.content || '');
        }
      } else if (currentFileContent !== '') {
         // If selected path is no longer a file or doesn't exist, clear content
         setCurrentFileContent('');
      }
    } else if (currentFileContent !== '') {
        setCurrentFileContent(''); // No file selected, clear content
    }
  }, [fileSystemRoot, selectedFilePath, getFile, currentFileContent]);


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
      onCommit={handleCommit}
      onPush={handlePush}
      // files prop removed, FileExplorer will use context
      fileSystemRoot={fileSystemRoot} // Pass root for FileExplorer
      selectedFilePath={selectedFilePath}
      currentFileContent={currentFileContent}
      onFileSelect={handleFileSelect}
      setFileContent={handleSetFileContentForEditor} 
      instruction={instruction}
      setInstruction={setInstruction}
      selectedAgent={selectedAgent}
      setSelectedAgent={setSelectedAgent}
      isSubmittingInstruction={isSubmittingInstruction}
      submitInstruction={handleSubmitInstruction}
      // logs prop removed, ConsoleOutput/ProjectConsole will use context
      addLog={addLog} // addLog can still be passed if some components don't use context directly
      applyPatch={applyPatch}
    />
  );
}
