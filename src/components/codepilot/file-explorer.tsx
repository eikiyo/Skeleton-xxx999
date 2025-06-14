
"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileNode } from '@/types'; // Using FileNode from context/types
import { cn } from '@/lib/utils';
import { useFileSystem } from '@/context/FileSystemContext';


interface FileExplorerNodeProps {
  node: FileNode;
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
  level?: number;
}

function FileExplorerNodeComponent({ node, selectedFilePath, onFileSelect, level = 0 }: FileExplorerNodeProps) {
  const [isOpen, setIsOpen] = React.useState(level < 2); // Auto-open top levels

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'file') {
      onFileSelect(node.path);
    } else { // Folder click
      setIsOpen(!isOpen); 
      // Optionally select folder to show its info or children differently
      // onFileSelect(node.path); // if you want folders to be "selectable"
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-8 px-2 py-1 text-sm",
          selectedFilePath === node.path && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }} // Adjusted padding
        onClick={handleSelect}
        aria-current={selectedFilePath === node.path ? "page" : undefined}
      >
        {node.type === 'folder' && (
          <span onClick={handleToggle} className="mr-1.5 cursor-pointer p-0.5 hover:bg-muted rounded">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
        {node.type === 'file' ? <FileText className="h-4 w-4 mr-2 flex-shrink-0" /> : <Folder className="h-4 w-4 mr-2 flex-shrink-0" />}
        <span className="truncate">{node.name}</span>
      </Button>
      {node.type === 'folder' && isOpen && node.children && node.children.length > 0 && (
        <div>
          {node.children.map(childNode => (
            <FileExplorerNodeComponent
              key={childNode.path}
              node={childNode}
              selectedFilePath={selectedFilePath}
              onFileSelect={onFileSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
      {node.type === 'folder' && isOpen && (!node.children || node.children.length === 0) && (
         <div style={{ paddingLeft: `${(level + 1) * 1.25 + 0.5 + 1.25}rem` }} className="text-xs text-muted-foreground italic py-1">
            Empty folder
          </div>
      )}
    </div>
  );
}


interface FileExplorerProps {
  // files prop removed, will use context
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
}

export function FileExplorer({ selectedFilePath, onFileSelect }: FileExplorerProps) {
  const { root } = useFileSystem();

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm">
      <h3 className="text-sm font-semibold p-3 border-b font-headline">File Explorer</h3>
      <ScrollArea className="flex-grow p-1">
        {!root.children || root.children.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">No repository cloned or workspace is empty.</p>
        ) : (
          root.children.map(node => (
            <FileExplorerNodeComponent 
                key={node.path}
                node={node}
                selectedFilePath={selectedFilePath}
                onFileSelect={onFileSelect}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
