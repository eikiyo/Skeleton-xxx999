
"use client";

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
// Label removed as it's not used
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// useFileSystem hook is not directly used here, setContent is passed as prop

interface CodeEditorProps {
  filePath: string | null;
  content: string; // Current content is passed directly
  setContent: (path: string, newContent: string) => void; // Callback to update content in context
  readOnly?: boolean;
  title?: string; 
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
          {filePath || title === "Project Structure" || title === "Canvas" ? ( 
            <Textarea
              value={content} // Use the passed content prop
              onChange={handleContentChange}
              readOnly={readOnly || title === "Project Structure"} 
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
