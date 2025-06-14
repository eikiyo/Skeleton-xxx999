
"use client";
import React, { useState, useEffect } from "react";
import { useFileSystem, type FileNode } from "@/context/FileSystemContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as esprima from "esprima";
import * as ts from "typescript";
import { Save } from "lucide-react"; // Import Save icon

function getSyntaxError(path: string, code: string): string | null {
  const fileName = path.split('/').pop() || path;
  if (fileName.endsWith(".js") || fileName.endsWith(".jsx")) {
    try {
      esprima.parseScript(code, { jsx: fileName.endsWith(".jsx") });
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
    };
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      options.target || ts.ScriptTarget.ESNext,
      true, 
      fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const host: ts.CompilerHost = {
      getSourceFile: (fileNameRequested: string) => fileNameRequested === fileName ? sourceFile : undefined,
      getDefaultLibFileName: () => "lib.d.ts",
      writeFile: () => {},
      getCurrentDirectory: () => "/",
      getDirectories: () => [],
      fileExists: (fileNameRequested: string) => fileNameRequested === fileName || fileNameRequested === "lib.d.ts",
      readFile: (fileNameRequested: string) => fileNameRequested === fileName ? code : (fileNameRequested === "lib.d.ts" ? "declare var console: any;" : undefined),
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      getEnvironmentVariable: () => "",
    };
    const program = ts.createProgram([fileName], options, host);
    const emitResult = program.emit();
    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    if (allDiagnostics && allDiagnostics.length > 0) {
      return allDiagnostics
        .map(diagnostic => {
          if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            return `L${line + 1}, C${character + 1}: ${message}`;
          }
          return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        })
        .join(" | ");
    }
    return null;
  }
  return null;
}

interface FileEditorProps {
  file: FileNode | null;
  repoUrl?: string; // For "Save to GitHub"
  targetBranch?: string; // For "Save to GitHub"
}

export default function FileEditor({
  file,
  repoUrl,
  targetBranch,
}: FileEditorProps) {
  const { updateFile } = useFileSystem();
  const { toast } = useToast();
  const [content, setContent] = useState(file?.content || "");
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [isSavingToGitHub, setIsSavingToGitHub] = useState(false);

  useEffect(() => {
    setContent(file?.content || "");
    setSyntaxError(null); 
  }, [file]);

  useEffect(() => {
    if (file && (file.path.endsWith(".js") || file.path.endsWith(".jsx") || file.path.endsWith(".ts") || file.path.endsWith(".tsx"))) {
      const handler = setTimeout(() => {
        setSyntaxError(getSyntaxError(file.path, content));
      }, 300);
      return () => clearTimeout(handler);
    } else {
      setSyntaxError(null); 
    }
  }, [content, file]);

  function handleSaveToMemory() {
    if (syntaxError) {
      toast({
        title: "Syntax Error",
        description: "Cannot save to memory: " + syntaxError,
        variant: "destructive",
      });
      return;
    }
    if (file) {
      updateFile(file.path, content);
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

    // Parse owner and repo from repoUrl (e.g., https://github.com/owner/repo.git or git@github.com:owner/repo.git)
    let owner, repoName;
    try {
        const url = new URL(repoUrl.replace(/\.git$/, '')); // Remove .git suffix for URL parser
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
            owner = pathParts[pathParts.length -2];
            repoName = pathParts[pathParts.length -1];
        } else {
          // Try regex for SSH-like URLs: git@github.com:owner/repo.git
          const sshMatch = repoUrl.match(/[:/]([\w-]+)\/([\w-]+)\.git$/);
          if (sshMatch && sshMatch.length === 3) {
            owner = sshMatch[1];
            repoName = sshMatch[2];
          } else {
            throw new Error("Could not parse owner/repo from URL.");
          }
        }
    } catch (e) {
        toast({ title: "Invalid Repository URL", description: "Could not parse owner and repository name from the URL.", variant: "destructive"});
        return;
    }
    
    if (!owner || !repoName) {
      toast({ title: "Invalid Repository URL", description: "Could not parse owner and repository name from the URL.", variant: "destructive"});
      return;
    }

    const filePathInRepo = file.path.startsWith('/') ? file.path.substring(1) : file.path;
    const commitMessage = `Update ${file.name}`;

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
          // sha: We are omitting SHA for now. This means updates to existing files might fail if SHA is required by GitHub API.
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "GitHub Save Failed",
          description: data.error || `Server responded with ${response.status}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Saved to GitHub",
          description: `${file.name} has been saved to branch ${targetBranch}. SHA: ${data.githubResponse?.commit?.sha?.substring(0,7) || 'N/A'}`,
        });
        // Optionally update in-memory file's SHA if backend returns it and if FileNode supports it.
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
            disabled={!!syntaxError || isSavingToGitHub}
            className="flex-1"
            size="sm"
            variant="outline"
          >
            <Save className="mr-2 h-4 w-4" />
            {syntaxError ? "Cannot Save (Fix Syntax)" : "Save to Session"}
          </Button>
          <Button
            onClick={handleSaveToGitHub}
            disabled={!!syntaxError || !repoUrl || !targetBranch || isSavingToGitHub}
            className="flex-1"
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSavingToGitHub ? "Saving to GitHub..." : (syntaxError ? "Cannot Save (Fix Syntax)" : "Save to GitHub")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
