
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/codepilot/main-layout';
import type { FileSystem, LogEntry, AgentType } from '@/types';
import { useToast } from "@/hooks/use-toast";
import DiffMatchPatch from 'diff-match-patch';

export default function CodePilotPage() {
  const { toast } = useToast();

  // Git State
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isCloned, setIsCloned] = useState<boolean>(false);

  // File System State
  const [files, setFiles] = useState<FileSystem>({});
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFileContent, setCurrentFileContent] = useState<string>('');

  // Instruction & Agent State
  const [instruction, setInstruction] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>('developer');
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState<boolean>(false);

  // Console State
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prevLogs => [...prevLogs, { id: String(Date.now()) + Math.random(), timestamp: new Date(), message, type }]);
    if (type === 'error') {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // --- Git Operation Handlers (Mocks) ---
  const handleClone = () => {
    if (!repoUrl) {
      addLog("Repository URL cannot be empty.", 'error');
      return;
    }
    addLog(`Cloning repository: ${repoUrl}... (Mocked)`, 'info');
    setTimeout(() => {
      const mockFiles: FileSystem = {
        'README.md': '# My Awesome Project\nThis is a sample README file.',
        'src/index.ts': "console.log('Hello, CodePilot!');",
        'src/app/page.tsx': "// Sample page.tsx content\nexport default function Page() { return <h1>Welcome</h1>; }",
        'package.json': '{ "name": "my-project", "version": "1.0.0" }'
      };
      setFiles(mockFiles);
      setIsCloned(true);
      setSelectedFilePath(null); // Reset selected file on new clone
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
    // Simulate pulling changes - potentially update files
    setTimeout(() => {
      // Example: Update README.md
      // const updatedFiles = { ...files, 'README.md': files['README.md'] + '\n\nUpdated content from pull.' };
      // setFiles(updatedFiles);
      // if (selectedFilePath === 'README.md') {
      //   setCurrentFileContent(updatedFiles['README.md']);
      // }
      addLog('Repository pulled successfully. (Mocked)', 'success');
    }, 1000);
  };

  const handleStageAll = () => addLog('Staging all changes... (Mocked)', 'info');
  const handleCommit = (message: string) => addLog(`Committing with message: "${message}"... (Mocked)`, 'info');
  const handlePush = () => addLog('Pushing changes... (Mocked)', 'info');


  // --- File System Handlers ---
  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
    setCurrentFileContent(files[path] || '');
    addLog(`Selected file: ${path}`, 'info');
  };

  // Renamed from setFileContent to avoid conflict with props in MainLayout if directly used.
  // This function is what CodeEditor calls via its setContent prop.
  const updateFileContentInState = (path: string, newContent: string) => {
    setFiles(prevFiles => ({ ...prevFiles, [path]: newContent }));
    if (path === selectedFilePath) {
      setCurrentFileContent(newContent);
    }
  };


  // --- Instruction Submission ---
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
    setTimeout(() => setIsSubmittingInstruction(false), 500); 
  };

  // --- Patch Application ---
  const applyPatch = useCallback((patchString: string) => {
    if (!selectedFilePath) {
      addLog("No file selected to apply patch.", "error");
      return;
    }
    const dmp = new DiffMatchPatch();
    const patches = dmp.patch_fromText(patchString);
    const [newText, results] = dmp.patch_apply(patches, currentFileContent);

    if (results.every(result => result === true)) {
      updateFileContentInState(selectedFilePath, newText as string); 
      addLog(`Patch applied successfully to ${selectedFilePath}.`, "success");
    } else {
      addLog(`Failed to apply patch to ${selectedFilePath}. Some hunks may have failed.`, "error");
      results.forEach((result, i) => {
        if (!result) addLog(`Patch hunk ${i+1} failed.`, "error");
      });
    }
  }, [selectedFilePath, currentFileContent, addLog, updateFileContentInState]);


  useEffect(() => {
    if (selectedFilePath && files[selectedFilePath] !== currentFileContent) {
      setCurrentFileContent(files[selectedFilePath]);
    }
  }, [files, selectedFilePath, currentFileContent]);


  return (
    <MainLayout
      repoUrl={repoUrl}
      setRepoUrl={setRepoUrl}
      token={token}
      setToken={setToken}
      isCloned={isCloned}
      onClone={handleClone}
      onPull={handlePull} // Pass new handler
      onStageAll={handleStageAll}
      onCommit={handleCommit}
      onPush={handlePush}
      files={files}
      selectedFilePath={selectedFilePath}
      currentFileContent={currentFileContent}
      onFileSelect={handleFileSelect}
      setFileContent={updateFileContentInState} // Pass the state updater function
      instruction={instruction}
      setInstruction={setInstruction}
      selectedAgent={selectedAgent}
      setSelectedAgent={setSelectedAgent}
      isSubmittingInstruction={isSubmittingInstruction}
      submitInstruction={handleSubmitInstruction}
      logs={logs}
      addLog={addLog}
      applyPatch={applyPatch}
    />
  );
}
