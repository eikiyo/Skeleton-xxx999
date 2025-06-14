
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

  const handleCommitAndPush = () => {
    if (!commitMessage.trim()) {
      alert("Commit message cannot be empty.");
      return;
    }
    onCommit(commitMessage);
    onPush(); // Call push immediately after commit
    setCommitMessage(''); 
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
          <Button onClick={handleCommitAndPush} disabled={!isCloned || !commitMessage.trim()} className="whitespace-nowrap">
            <GitCommit className="mr-2 h-4 w-4" /> Commit & Push
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onStageAll} disabled={!isCloned} className="flex-1">
            <UploadCloud className="mr-2 h-4 w-4" /> Stage All
          </Button>
          {/* Push button is now part of Commit & Push, so it can be removed if desired, or kept for standalone push */}
          {/* For this iteration, keeping standalone Push might be confusing. Let's remove it. */}
          {/* <Button onClick={onPush} disabled={!isCloned} className="flex-1">
            <ArrowUpToLine className="mr-2 h-4 w-4" /> Push
          </Button> */}
        </div>
      </CardContent>
    </Card>
  );
}
