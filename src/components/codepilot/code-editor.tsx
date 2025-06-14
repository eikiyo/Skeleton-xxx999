
"use client";

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CodeEditorProps {
  filePath: string | null;
  content: string; 
  setContent: (path: string, newContent: string) => void; 
  readOnly?: boolean;
  title?: string; 
}

export function CodeEditor({ filePath, content, setContent, readOnly = false, title }: CodeEditorProps) {
  
  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (filePath && !readOnly) {
      setContent(filePath, event.target.value);
    }
  };

  // Determine display title: use provided title, or construct from filePath, or default.
  let displayTitle = title;
  if (!displayTitle) {
    if (filePath) {
      const fileName = filePath.split('/').pop();
      displayTitle = readOnly ? `Preview: ${fileName}` : `Editing: ${fileName}`;
    } else {
      displayTitle = 'Code Editor';
    }
  }


  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base font-medium font-headline truncate">
          {displayTitle}
          {filePath && <span className="text-xs text-muted-foreground ml-2 font-normal truncate">({filePath})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full w-full">
          {filePath || title ? ( // Ensure editor shows if a title is explicitly passed (e.g. "Canvas")
            <Textarea
              value={content}
              onChange={handleContentChange}
              readOnly={readOnly} 
              placeholder={readOnly ? "No file selected or file is empty." : "Start coding..."}
              className="font-code h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 text-sm bg-background text-foreground"
              aria-label={filePath ? `Code editor for ${filePath}` : 'Code editor'}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
              Select a file to view or edit its content.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
