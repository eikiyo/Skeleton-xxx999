"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateCodeSnippet, GenerateCodeSnippetOutput }  from '@/ai/flows/generate-code-snippet';
import { Loader2, Copy } from 'lucide-react';

interface DeveloperAgentPanelProps {
  instruction: string;
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;
}

export function DeveloperAgentPanel({ instruction, addLog }: DeveloperAgentPanelProps) {
  const [language, setLanguage] = useState('typescript');
  const [framework, setFramework] = useState('nextjs');
  const [existingCode, setExistingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<GenerateCodeSnippetOutput | null>(null);

  const handleSubmit = async () => {
    if (!instruction.trim()) {
      addLog("Developer Agent: Feature request cannot be empty.", "error");
      return;
    }
    setIsLoading(true);
    setOutput(null);
    addLog(`Developer Agent: Generating code for "${instruction}"...`, "agent");

    try {
      const result = await generateCodeSnippet({
        featureRequest: instruction,
        programmingLanguage: language,
        framework: framework,
        existingCodeContext: existingCode,
      });
      setOutput(result);
      addLog("Developer Agent: Code snippet generated successfully.", "success");
    } catch (error) {
      console.error("Error generating code snippet:", error);
      addLog(`Developer Agent: Error generating code snippet. ${error instanceof Error ? error.message : String(error)}`, "error");
      setOutput({ codeSnippet: "Error generating code.", explanation: "An error occurred." });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => addLog("Code copied to clipboard!", "success"))
      .catch(err => addLog("Failed to copy code: " + err, "error"));
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Developer Agent</CardTitle>
        <CardDescription>Generate code snippets and file templates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dev-feature-request">Feature Request (from Instruction Input)</Label>
          <Textarea id="dev-feature-request" value={instruction} readOnly rows={3} className="font-code bg-muted" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dev-language">Programming Language</Label>
            <Input id="dev-language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g., typescript, python" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dev-framework">Framework/Library (Optional)</Label>
            <Input id="dev-framework" value={framework} onChange={(e) => setFramework(e.target.value)} placeholder="e.g., react, nextjs, django" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dev-existing-code">Existing Code Context (Optional)</Label>
          <Textarea
            id="dev-existing-code"
            value={existingCode}
            onChange={(e) => setExistingCode(e.target.value)}
            placeholder="Provide existing code for context..."
            rows={5}
            className="font-code"
          />
        </div>
        <Button onClick={handleSubmit} disabled={isLoading || !instruction.trim()} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Code
        </Button>

        {output && (
          <div className="space-y-4 pt-4 border-t mt-6">
            <h3 className="text-lg font-semibold font-headline">Generated Output</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Code Snippet</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(output.codeSnippet)}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <ScrollArea className="h-64 w-full rounded-md border p-4 bg-background">
                <pre className="font-code text-sm whitespace-pre-wrap">{output.codeSnippet}</pre>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label>Explanation</Label>
              <p className="text-sm text-muted-foreground p-4 border rounded-md bg-background">{output.explanation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
