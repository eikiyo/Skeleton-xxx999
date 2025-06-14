
"use client";
import React from "react";
import type { FileNode } from "@/context/FileSystemContext";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FileEditor({
  file,
  onChange,
  readOnly = false,
}: {
  file: FileNode | null;
  onChange: (content: string) => void;
  readOnly?: boolean;
}) {
  if (!file) {
    return (
      <Card className="h-full flex items-center justify-center shadow-sm">
        <p className="text-muted-foreground">Select a file to view or edit.</p>
      </Card>
    );
  }
  
  if (file.type !== "file") {
    return (
       <Card className="h-full flex items-center justify-center shadow-sm">
        <p className="text-muted-foreground">Selected item is a folder. Please select a file to edit.</p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base font-medium font-headline">
          {readOnly ? "Previewing: " : "Editing: "} {file.name}
          <span className="text-xs text-muted-foreground ml-2 font-normal">({file.path})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <Textarea
          value={file.content || ""}
          onChange={e => !readOnly && onChange(e.target.value)}
          readOnly={readOnly}
          className="font-code h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 text-sm bg-background text-foreground"
          placeholder={readOnly ? "File is empty or content cannot be displayed." : "Start coding..."}
          aria-label={`Content of ${file.name}`}
        />
      </CardContent>
    </Card>
  );
}
