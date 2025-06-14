"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { suggestCodeFixes, SuggestCodeFixesOutput } from '@/ai/flows/suggest-code-fixes';
import { Loader2, Copy, CheckCircle, XCircle } from 'lucide-react';
import type { CodeSuggestion } from '@/types';

interface QAAgentPanelProps {
  currentCode: string; // From selected file or editor
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;
  applyPatch: (patch: string) => void; // Callback to apply patch to currentCode
}

export function QAAgentPanel({ currentCode, addLog, applyPatch }: QAAgentPanelProps) {
  const [testResults, setTestResults] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<SuggestCodeFixesOutput | null>(null);

  const handleSubmit = async () => {
    if (!currentCode.trim()) {
      addLog("QA Agent: Current code cannot be empty.", "error");
      return;
    }
    if (!testResults.trim()) {
        addLog("QA Agent: Test results cannot be empty.", "error");
        return;
    }
    setIsLoading(true);
    setOutput(null);
    addLog("QA Agent: Analyzing code and test results...", "agent");

    try {
      const result = await suggestCodeFixes({
        code: currentCode,
        testResults: testResults,
      });
      setOutput(result);
      addLog(`QA Agent: ${result.fixes.length > 0 ? result.fixes.length : 'No'} fix(es) suggested.`, result.fixes.length > 0 ? "success" : "info");
    } catch (error) {
      console.error("Error suggesting code fixes:", error);
      addLog(`QA Agent: Error suggesting code fixes. ${error instanceof Error ? error.message : String(error)}`, "error");
      setOutput({ fixes: [{ description: "Error generating fixes.", patch: "An error occurred."}] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPatch = (patch: string) => {
    addLog("QA Agent: Attempting to apply patch...", "agent");
    try {
      applyPatch(patch); // This should trigger an update in the parent component's state for currentCode
      addLog("QA Agent: Patch applied successfully (simulated). Review changes.", "success");
    } catch (e) {
      addLog(`QA Agent: Failed to apply patch. ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };
  
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => addLog("Patch copied to clipboard!", "success"))
      .catch(err => addLog("Failed to copy patch: " + err, "error"));
  };


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">QA Agent</CardTitle>
        <CardDescription>Run automated tests and suggest fixes for identified issues.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="qa-current-code">Current Code</Label>
          <ScrollArea className="h-48 w-full rounded-md border p-2 bg-muted">
            <pre className="font-code text-sm whitespace-pre-wrap">{currentCode || "No code loaded or selected."}</pre>
          </ScrollArea>
        </div>
        <div className="space-y-2">
          <Label htmlFor="qa-test-results">Test Results / Error Logs</Label>
          <Textarea
            id="qa-test-results"
            value={testResults}
            onChange={(e) => setTestResults(e.target.value)}
            placeholder="Paste test results or error logs here..."
            rows={5}
            className="font-code"
          />
        </div>
        <Button onClick={handleSubmit} disabled={isLoading || !currentCode.trim() || !testResults.trim()} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Suggest Fixes
        </Button>

        {output && output.fixes.length > 0 && (
          <div className="space-y-4 pt-4 border-t mt-6">
            <h3 className="text-lg font-semibold font-headline">Suggested Fixes</h3>
            <Accordion type="single" collapsible className="w-full">
              {output.fixes.map((fix: CodeSuggestion, index: number) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                        <span>Fix #{index + 1}: {fix.description}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <div className="flex justify-end gap-2 mb-2">
                        <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(fix.patch)}>
                            <Copy className="h-3 w-3 mr-1" /> Copy Patch
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleApplyPatch(fix.patch)}>
                            Apply Patch
                        </Button>
                    </div>
                    <ScrollArea className="h-48 w-full rounded-md border p-2 bg-background">
                      <pre className="font-code text-sm whitespace-pre-wrap">{fix.patch}</pre>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
        {output && output.fixes.length === 0 && !isLoading && (
            <div className="flex items-center justify-center text-muted-foreground p-4 border rounded-md mt-4">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                No fixes suggested for the provided code and test results.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
