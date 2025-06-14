"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GitFork, Github, PlusSquare, GitCommit, ArrowUpCircle, DownloadCloud } from 'lucide-react';

interface GitControlsProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  token: string;
  setToken: (token: string) => void;
  onClone: () => void;
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onPush: () => void;
  isCloned: boolean;
}

export function GitControls({
  repoUrl,
  setRepoUrl,
  token,
  setToken,
  onClone,
  onStageAll,
  onCommit,
  onPush,
  isCloned
}: GitControlsProps) {
  const [commitMessage, setCommitMessage] = useState('');

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      alert('Commit message cannot be empty.'); // Or use toast
      return;
    }
    onCommit(commitMessage);
    setCommitMessage('');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="font-headline text-lg flex items-center">
            <Github className="h-5 w-5 mr-2" /> Git Controls
        </CardTitle>
        <CardDescription>Manage your repository.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isCloned ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                aria-label="Repository URL"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pat">Personal Access Token (Optional)</Label>
              <Input
                id="pat"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your PAT for private repos"
                aria-label="Personal Access Token"
              />
            </div>
            <Button onClick={onClone} className="w-full">
              <DownloadCloud className="mr-2 h-4 w-4" /> Clone Repository
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onStageAll} variant="outline" className="w-full">
              <PlusSquare className="mr-2 h-4 w-4" /> Stage All Changes (Mock)
            </Button>
            <div className="space-y-1">
              <Label htmlFor="commit-message">Commit Message</Label>
              <Textarea
                id="commit-message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Enter commit message"
                rows={2}
                className="font-code"
                aria-label="Commit Message"
              />
            </div>
            <div className="flex gap-2">
                <Button onClick={handleCommit} variant="outline" className="flex-1">
                    <GitCommit className="mr-2 h-4 w-4" /> Commit (Mock)
                </Button>
                <Button onClick={onPush} className="flex-1">
                    <ArrowUpCircle className="mr-2 h-4 w-4" /> Push (Mock)
                </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
