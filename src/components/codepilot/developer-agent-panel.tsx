
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collaborativeGenerateCode, CollaborativeCodeGenerationOutput }  from '@/ai/flows/collaborative-code-generation';
import { Loader2, Copy, CheckSquare, AlertCircle, Info } from 'lucide-react';

interface DeveloperAgentPanelProps {
  instruction: string;
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;
  selectedFilePath: string | null;
  setFileContent: (path: string, content: string) => void;
}

export function DeveloperAgentPanel({ instruction, addLog, selectedFilePath, setFileContent }: DeveloperAgentPanelProps) {
  const [language, setLanguage] = useState('typescript'); // Kept for potential future direct use, though collaborative flow defaults
  const [framework, setFramework] = useState('nextjs'); // Kept for potential future direct use
  const [existingCode, setExistingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<CollaborativeCodeGenerationOutput | null>(null);

  const handleSubmit = async () => {
    if (!instruction.trim()) {
      addLog("Developer Agent: Feature request cannot be empty.", "error");
      return;
    }
    setIsLoading(true);
    setOutput(null);
    addLog(`Developer Agent: Starting collaborative code generation for "${instruction}"...`, "agent");

    try {
      // Using the new collaborative flow
      const result = await collaborativeGenerateCode({
        featureRequest: instruction,
        programmingLanguage: language, // Collaborative flow will use its defaults but we pass it
        framework: framework,         // Collaborative flow will use its defaults but we pass it
        existingCodeContext: existingCode,
      });
      setOutput(result);

      if (result.status === 'success') {
        addLog(`Collaborative Agent: ${result.message}`, "success");
      } else if (result.status === 'needs_clarification') {
        addLog(`Collaborative Agent: ${result.message}`, "agent"); // 'agent' type for clarification messages
      } else { // error
        addLog(`Collaborative Agent: ${result.message}`, "error");
      }

    } catch (error) {
      console.error("Error in collaborative code generation:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Collaborative Agent: Error during generation. ${errorMessage}`, "error");
      setOutput({ status: 'error', message: `An unexpected error occurred: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyToClipboard = (text: string | undefined) => {
    if (!text) {
      addLog("No code to copy.", "error");
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => addLog("Code copied to clipboard!", "success"))
      .catch(err => addLog("Failed to copy code: " + err, "error"));
  };

  const handleApplyToEditor = () => {
    if (output?.finalCodeSnippet && selectedFilePath) {
      setFileContent(selectedFilePath, output.finalCodeSnippet);
      addLog(`Collaborative Agent: Applied generated code to ${selectedFilePath}.`, "success");
    } else {
      if (!selectedFilePath) {
        addLog("Collaborative Agent: No file selected in the editor to apply code to. Please select a file.", "error");
      }
      if (!output?.finalCodeSnippet) {
         addLog("Collaborative Agent: No final code snippet available to apply.", "error");
      }
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Developer Agent (Collaborative Mode)</CardTitle>
        <CardDescription>Generate code snippets with automated QA review and refinement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dev-feature-request">Feature Request (from Instruction Input)</Label>
          <Textarea id="dev-feature-request" value={instruction} readOnly rows={3} className="font-code bg-muted" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dev-language">Programming Language (Info Only)</Label>
            <Input id="dev-language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g., typescript" readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dev-framework">Framework/Library (Info Only)</Label>
            <Input id="dev-framework" value={framework} onChange={(e) => setFramework(e.target.value)} placeholder="e.g., nextjs" readOnly />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dev-existing-code">Existing Code Context (Optional for initial generation)</Label>
          <Textarea
            id="dev-existing-code"
            value={existingCode}
            onChange={(e) => setExistingCode(e.target.value)}
            placeholder="Provide existing code if relevant for context..."
            rows={5}
            className="font-code"
          />
        </div>
        <Button onClick={handleSubmit} disabled={isLoading || !instruction.trim()} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Code (Collaboratively)
        </Button>

        {output && (
          <div className="space-y-4 pt-4 border-t mt-6">
            <h3 className="text-lg font-semibold font-headline">Agent Output</h3>
            
            {output.status === 'error' && (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <p>{output.message}</p>
              </div>
            )}

            {output.status === 'needs_clarification' && (
              <div className="p-4 border rounded-md bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                 <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                 <div>
                    <p className="font-semibold">{output.message}</p>
                    {output.qaFeedbackOnFinalIteration && (
                        <div className="mt-2">
                            <Label>Last QA Feedback:</Label>
                            <ScrollArea className="h-32 w-full rounded-md border p-2 mt-1 bg-background">
                                <pre className="font-code text-xs whitespace-pre-wrap">{output.qaFeedbackOnFinalIteration}</pre>
                            </ScrollArea>
                        </div>
                    )}
                 </div>
              </div>
            )}
            
            {output.finalCodeSnippet && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>
                    {output.status === 'success' ? 'Final Code Snippet' : 'Last Generated Code Snippet'}
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(output.finalCodeSnippet)}>
                      <Copy className="h-4 w-4 mr-2" /> Copy Snippet
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleApplyToEditor}
                      disabled={!selectedFilePath || !output.finalCodeSnippet}
                      title={!selectedFilePath ? "Select a file in the editor to apply code" : "Apply to selected file"}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" /> Apply to Editor
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64 w-full rounded-md border p-4 bg-background">
                  <pre className="font-code text-sm whitespace-pre-wrap">{output.finalCodeSnippet}</pre>
                </ScrollArea>
              </div>
            )}

            {output.explanation && (
              <div className="space-y-2">
                <Label>Explanation</Label>
                <p className="text-sm text-muted-foreground p-4 border rounded-md bg-background">{output.explanation}</p>
              </div>
            )}
             {!output.finalCodeSnippet && output.status !== 'error' && output.status !== 'needs_clarification' && (
                <div className="p-4 border rounded-md bg-muted text-muted-foreground">
                    <p>{output.message || "Waiting for agent response..."}</p>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
