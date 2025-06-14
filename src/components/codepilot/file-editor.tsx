
"use client";
import React, { useState, useEffect } from "react";
import { useFileSystem, type FileNode } from "@/context/FileSystemContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import * as esprima from "esprima";
import * as ts from "typescript";

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
    // For TypeScript, we'll use the TypeScript compiler API to get diagnostics.
    // This provides more accurate errors than just transpiling.
    const options: ts.CompilerOptions = {
      noEmit: true, // Don't generate output files
      target: ts.ScriptTarget.ESNext, // Or your desired target
      module: ts.ModuleKind.ESNext,  // Or your desired module system
      jsx: fileName.endsWith(".tsx") ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None, // Enable JSX if .tsx
    };
    // Create a simple virtual source file
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      options.target || ts.ScriptTarget.ESNext,
      true, // setParentNodes
      fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS // Set script kind
    );

    // Create a Program (needed for more comprehensive diagnostics)
    // For a single file without complex module resolution, a simple setup works
    const host: ts.CompilerHost = {
      getSourceFile: (fileNameRequested: string) => fileNameRequested === fileName ? sourceFile : undefined,
      getDefaultLibFileName: () => "lib.d.ts", // Provide a dummy default lib
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

export default function FileEditor({
  file,
}: {
  file: FileNode | null;
}) {
  const { updateFile } = useFileSystem();
  const [content, setContent] = useState(file?.content || "");
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  useEffect(() => {
    setContent(file?.content || "");
    setSyntaxError(null); // Reset error when file changes
  }, [file]);

  useEffect(() => {
    if (file && (file.path.endsWith(".js") || file.path.endsWith(".jsx") || file.path.endsWith(".ts") || file.path.endsWith(".tsx"))) {
      // Debounce syntax checking slightly to avoid checking on every keystroke immediately
      const handler = setTimeout(() => {
        setSyntaxError(getSyntaxError(file.path, content));
      }, 300);
      return () => clearTimeout(handler);
    } else {
      setSyntaxError(null); // Clear error if not a JS/TS file
    }
  }, [content, file]);

  function handleSave() {
    if (syntaxError) {
      // This alert is mostly for debugging; the button is disabled.
      // A toast notification might be better for user feedback.
      alert("Cannot save due to syntax error: " + syntaxError);
      return;
    }
    if (file) {
      updateFile(file.path, content);
      // Potentially add a toast here for "File saved"
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
        <div className="p-2 border-t">
          <Button
            onClick={handleSave}
            disabled={!!syntaxError}
            className="w-full"
            size="sm"
          >
            {syntaxError ? "Cannot Save (Fix Syntax)" : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
