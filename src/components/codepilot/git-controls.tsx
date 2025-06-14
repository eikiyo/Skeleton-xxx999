
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, DownloadCloud } from 'lucide-react';

interface GitControlsProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  token: string;
  setToken: (token: string) => void;
  onClone: () => void;
  isCloned: boolean;
  // Removed onStageAll, onCommit, onPush as they are no longer used in this simplified version
}

export function GitControls({
  repoUrl,
  setRepoUrl,
  token,
  setToken,
  onClone,
  isCloned
}: GitControlsProps) {

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="font-headline text-lg flex items-center">
            <Github className="h-5 w-5 mr-2" /> Git Controls
        </CardTitle>
        <CardDescription>Manage your repository.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="repo-url">Repository URL</Label>
          <Input
            id="repo-url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            aria-label="Repository URL"
            disabled={isCloned}
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
            disabled={isCloned}
          />
        </div>
        <Button onClick={onClone} className="w-full" disabled={isCloned}>
          <DownloadCloud className="mr-2 h-4 w-4" /> 
          {isCloned ? 'Repository Cloned' : 'Clone Repository'}
        </Button>
      </CardContent>
    </Card>
  );
}
