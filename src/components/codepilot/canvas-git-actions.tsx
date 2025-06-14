
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCommit, ArrowUpToLine, UploadCloud } from 'lucide-react'; // Git icons

interface CanvasGitActionsProps {
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onPush: () => void;
  isCloned: boolean;
}

export function CanvasGitActions({ onStageAll, onCommit, onPush, isCloned }: CanvasGitActionsProps) {
  const [commitMessage, setCommitMessage] = useState('');

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      // Optionally, show a toast or validation message
      alert("Commit message cannot be empty.");
      return;
    }
    onCommit(commitMessage);
    setCommitMessage(''); // Clear message after commit
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base font-medium font-headline">Git Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="flex-grow font-code"
            disabled={!isCloned}
            aria-label="Commit message"
          />
          <Button onClick={handleCommit} disabled={!isCloned || !commitMessage.trim()} className="whitespace-nowrap">
            <GitCommit className="mr-2 h-4 w-4" /> Commit
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onStageAll} disabled={!isCloned} className="flex-1">
            <UploadCloud className="mr-2 h-4 w-4" /> Stage All
          </Button>
          <Button onClick={onPush} disabled={!isCloned} className="flex-1">
            <ArrowUpToLine className="mr-2 h-4 w-4" /> Push
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
