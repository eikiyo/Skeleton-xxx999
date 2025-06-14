
"use client";

import React from "react";
import { useFileSystem, type FileNode } from "@/context/FileSystemContext"; // Ensure correct import
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileExplorerNodeProps {
  node: FileNode;
  onFileSelect: (file: FileNode) => void;
  selectedFilePath: string | null; // To highlight selected file
  level?: number;
}

function FileExplorerNodeComponent({ node, onFileSelect, selectedFilePath, level = 0 }: FileExplorerNodeProps) {
  const [isOpen, setIsOpen] = React.useState(level < 1); // Auto-open first level

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(node); // Select folder or file
    if (node.type === 'folder') {
      setIsOpen(!isOpen); // Also toggle folder on name click
    }
  };

  const Icon = node.type === 'folder' ? Folder : FileText;
  const ChevronIcon = isOpen ? ChevronDown : ChevronRight;

  return (
    <div>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-8 px-2 py-1 text-sm truncate",
          selectedFilePath === node.path && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
        onClick={handleSelect}
        aria-current={selectedFilePath === node.path ? "page" : undefined}
      >
        {node.type === 'folder' && (
          <span onClick={handleToggle} className="mr-1.5 cursor-pointer p-0.5 hover:bg-muted rounded">
            <ChevronIcon className="h-4 w-4" />
          </span>
        )}
        <Icon className={cn("h-4 w-4 mr-2 flex-shrink-0", node.type === 'folder' ? "text-sky-500" : "text-slate-500")} />
        <span className="truncate">{node.name}</span>
      </Button>
      {node.type === 'folder' && isOpen && node.children && node.children.length > 0 && (
        <div>
          {node.children.map(childNode => (
            <FileExplorerNodeComponent
              key={childNode.path}
              node={childNode}
              onFileSelect={onFileSelect}
              selectedFilePath={selectedFilePath}
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

export function FileExplorer({
  onFileSelect,
  selectedFilePath,
}: {
  onFileSelect: (file: FileNode) => void;
  selectedFilePath: string | null;
}) {
  const { root } = useFileSystem();

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm">
      <h3 className="text-sm font-semibold p-3 border-b font-headline">File Explorer</h3>
      <div className="flex-grow p-1 overflow-y-auto">
        {!root.children || root.children.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">No repository cloned or workspace is empty.</p>
        ) : (
          root.children.map(node => (
            <FileExplorerNodeComponent 
                key={node.path}
                node={node}
                onFileSelect={onFileSelect}
                selectedFilePath={selectedFilePath}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Default export to satisfy module requirements if this is the main export
export default FileExplorer;
