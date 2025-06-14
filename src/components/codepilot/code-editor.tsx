
"use client";

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CodeEditorProps {
  filePath: string | null;
  content: string;
  setContent: (path: string, newContent: string) => void;
  readOnly?: boolean;
  title?: string; // New optional title prop
}

export function CodeEditor({ filePath, content, setContent, readOnly = false, title }: CodeEditorProps) {
  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (filePath && !readOnly) {
      setContent(filePath, event.target.value);
    }
  };

  const displayTitle = title ?? (filePath ? `Editing: ${filePath}` : 'Code Editor');

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base font-medium font-headline">
          {displayTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full w-full">
          {filePath || title === "Project Structure" ? ( // Allow showing editor even if no file selected, if title is Project Structure
            <Textarea
              value={content}
              onChange={handleContentChange}
              readOnly={readOnly || title === "Project Structure"} // Make readOnly if it's project structure view (no file selected for editing)
              placeholder={readOnly ? "No file selected or file is empty." : "Start coding..."}
              className="font-code h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 text-sm bg-background text-foreground"
              aria-label={filePath ? `Code editor for ${filePath}` : 'Code editor'}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a file to view or edit its content.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
