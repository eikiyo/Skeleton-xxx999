
"use client";
import React, { useState, useEffect } from "react";
import { useFileSystem, type FileNode } from "@/context/FileSystemContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as esprima from "esprima";
import * as ts from "typescript";
import { Save, Loader2 } from "lucide-react"; 

function getSyntaxError(path: string, code: string): string | null {
  const fileName = path.split('/').pop() || path;
  if (fileName.endsWith(".js") || fileName.endsWith(".jsx")) {
    try {
      esprima.parseScript(code, { jsx: fileName.endsWith(".jsx"), tolerant: true }); // Added tolerant
      return null;
    } catch (err: any) {
      return err.description || err.message || "Unknown JS syntax error";
    }
  }
  if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) {
    const options: ts.CompilerOptions = {
      noEmit: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: fileName.endsWith(".tsx") ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
      allowJs: true, // Allow JS files to be processed by TS compiler (for mixed projects)
      skipLibCheck: true, // Skip checking declaration files
      forceConsistentCasingInFileNames: true,
      // noErrorTruncation: true, // Potentially useful for longer error messages
    };
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      options.target || ts.ScriptTarget.ESNext,
      true, 
      fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : (fileName.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS) // Adjust ScriptKind
    );
    const host: ts.CompilerHost = {
      getSourceFile: (fileNameRequested: string) => fileNameRequested === fileName ? sourceFile : undefined,
      getDefaultLibFileName: () => "lib.esnext.d.ts", // More common default lib
      writeFile: () => {},
      getCurrentDirectory: () => "/",
      getDirectories: () => [],
      fileExists: (fileNameRequested: string) => fileNameRequested === fileName || fileNameRequested.startsWith("lib."),
      readFile: (fileNameRequested: string) => fileNameRequested === fileName ? code : (fileNameRequested.startsWith("lib.") ? "" : undefined), // Simplified lib file handling
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      getEnvironmentVariable: () => "",
    };
    const program = ts.createProgram([fileName], options, host);
    const emitResult = program.emit(); // Emit is needed to gather all diagnostics
    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    if (allDiagnostics && allDiagnostics.length > 0) {
      return allDiagnostics
        .map(diagnostic => {
          let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            return `L${line + 1}, C${character + 1}: ${message}`;
          }
          return message;
        })
        .join(" | ");
    }
    return null;
  }
  return null;
}

interface FileEditorProps {
  file: FileNode | null;
  repoUrl?: string; 
  targetBranch?: string;
}

export default function FileEditor({
  file,
  repoUrl,
  targetBranch,
}: FileEditorProps) {
  const { updateFileDetails, getFile } = useFileSystem(); 
  const { toast } = useToast();
  const [content, setContent] = useState(file?.content || "");
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [isSavingToGitHub, setIsSavingToGitHub] = useState(false);
  const [isSavingToMemory, setIsSavingToMemory] = useState(false);


  useEffect(() => {
    setContent(file?.content || "");
    setSyntaxError(null); 
  }, [file]);

  useEffect(() => {
    if (file && (file.path.endsWith(".js") || file.path.endsWith(".jsx") || file.path.endsWith(".ts") || file.path.endsWith(".tsx"))) {
      const handler = setTimeout(() => {
        const currentFile = file ? getFile(file.path) : null;
        if (currentFile && currentFile.name) { 
             setSyntaxError(getSyntaxError(currentFile.path, content)); // Use full path for getSyntaxError
        } else {
            setSyntaxError(null); 
        }
      }, 300);
      return () => clearTimeout(handler);
    } else {
      setSyntaxError(null); 
    }
  }, [content, file, getFile]);


  async function handleSaveToMemory() {
    if (syntaxError) {
      toast({
        title: "Syntax Error",
        description: "Cannot save to memory: " + syntaxError,
        variant: "destructive",
      });
      return;
    }
    if (file) {
      setIsSavingToMemory(true);
      updateFileDetails(file.path, { content }); // Update content only
      await new Promise(resolve => setTimeout(resolve, 300)); 
      setIsSavingToMemory(false);
      toast({
        title: "File Saved (In-Memory)",
        description: `${file.name} has been saved to the session.`,
      });
    }
  }

  async function handleSaveToGitHub() {
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    if (syntaxError) {
      toast({ title: "Syntax Error", description: "Fix syntax errors before saving to GitHub.", variant: "destructive" });
      return;
    }
    if (!repoUrl || !targetBranch) {
      toast({ title: "Configuration Error", description: "Repository URL or branch not set for GitHub save.", variant: "destructive" });
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
        toast({ title: "Invalid Repository URL", description: `Could not parse owner and repository name. ${e instanceof Error ? e.message : ''}`, variant: "destructive"});
        return;
    }
    
    if (!owner || !repoName) {
      toast({ title: "Invalid Repository URL", description: "Could not parse owner and repository name from the URL.", variant: "destructive"});
      return;
    }

    const commitMessage = window.prompt(`Enter commit message for ${file.name}:`, `Update ${file.name}`) || `Update ${file.name}`;
    if (!commitMessage.trim()) {
        toast({ title: "Commit Aborted", description: "Commit message cannot be empty.", variant: "destructive" });
        return;
    }
    
    const filePathInRepo = file.path.startsWith('/') ? file.path.substring(1) : file.path;
    const fileSha = file.sha; 

    setIsSavingToGitHub(true);
    try {
      const response = await fetch('/api/git/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo: repoName,
          path: filePathInRepo,
          content,
          message: commitMessage,
          branch: targetBranch,
          ...(fileSha ? { sha: fileSha } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "GitHub Save Failed",
          description: data.error || data.message || `Server responded with ${response.status}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Saved to GitHub",
          description: `${file.name} has been saved to branch ${targetBranch}. Commit: ${data.commit?.sha?.substring(0,7) || 'N/A'}`,
        });
        // Update in-memory file's content and SHA
        updateFileDetails(file.path, { content, sha: data.githubResponse?.content?.sha }); 
      }
    } catch (error) {
      toast({
        title: "Save to GitHub Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSavingToGitHub(false);
    }
  }

  if (!file) {
    return (
      <Card className="h-full flex items-center justify-center shadow-sm">
        <p className="text-muted-foreground">Select a file to view or edit.</p>
      </Card>
    );
  }
  
  if (file.type !== "file") {
    return (
       <Card className="h-full flex items-center justify-center shadow-sm">
        <p className="text-muted-foreground">Selected item is a folder. Please select a file to edit.</p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base font-medium font-headline">
          Editing: {file.name}
          <span className="text-xs text-muted-foreground ml-2 font-normal">({file.path})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow flex flex-col">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="font-code flex-grow w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 text-sm bg-background text-foreground"
          placeholder="Start coding..."
          aria-label={`Content of ${file.name}`}
        />
        {syntaxError && (
          <div className="text-destructive p-2 text-xs border-t bg-destructive/10 whitespace-pre-wrap">
            <strong>Syntax Error:</strong> {syntaxError}
          </div>
        )}
        <div className="p-2 border-t flex gap-2">
          <Button
            onClick={handleSaveToMemory}
            disabled={!!syntaxError || isSavingToGitHub || isSavingToMemory}
            className="flex-1"
            size="sm"
            variant="outline"
          >
            {isSavingToMemory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSavingToMemory ? "Saving..." : (syntaxError ? "Fix Syntax to Save" : "Save to Session")}
          </Button>
          <Button
            onClick={handleSaveToGitHub}
            disabled={!!syntaxError || !repoUrl || !targetBranch || isSavingToGitHub || isSavingToMemory}
            className="flex-1"
            size="sm"
          >
            {isSavingToGitHub ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSavingToGitHub ? "Saving to GitHub..." : (syntaxError ? "Fix Syntax to Save" : "Save to GitHub")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

    

    