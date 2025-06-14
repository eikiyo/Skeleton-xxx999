"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { FileSystem } from '@/types';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
  files: FileSystem;
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
}

// Basic tree structure generation (can be improved for deeply nested structures)
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

function buildFileTree(files: FileSystem): TreeNode[] {
  const root: TreeNode = { name: 'root', path: '', type: 'folder', children: [] };

  Object.keys(files).forEach(path => {
    const parts = path.split('/');
    let currentLevel = root.children!;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let node = currentLevel.find(n => n.name === part);
      const isLastPart = index === parts.length - 1;

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isLastPart ? 'file' : 'folder',
          children: isLastPart ? undefined : [],
        };
        currentLevel.push(node);
      }
      
      if (!isLastPart) {
        if (!node.children) node.children = []; // Ensure children array exists for folders
        currentLevel = node.children;
      }
    });
  });
  return root.children || [];
}


interface FileExplorerNodeProps {
  node: TreeNode;
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
  level?: number;
}

function FileExplorerNode({ node, selectedFilePath, onFileSelect, level = 0 }: FileExplorerNodeProps) {
  const [isOpen, setIsOpen] = React.useState(true); // Folders open by default

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
    } else {
      setIsOpen(!isOpen); // Also toggle folder on name click
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
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={handleSelect}
        aria-current={selectedFilePath === node.path ? "page" : undefined}
      >
        {node.type === 'folder' && (
          <span onClick={handleToggle} className="mr-1 cursor-pointer">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
        {node.type === 'file' ? <FileText className="h-4 w-4 mr-2 flex-shrink-0" /> : <Folder className="h-4 w-4 mr-2 flex-shrink-0" />}
        <span className="truncate">{node.name}</span>
      </Button>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map(childNode => (
            <FileExplorerNode
              key={childNode.path}
              node={childNode}
              selectedFilePath={selectedFilePath}
              onFileSelect={onFileSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}


export function FileExplorer({ files, selectedFilePath, onFileSelect }: FileExplorerProps) {
  const fileTree = buildFileTree(files);

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-semibold p-3 border-b font-headline">File Explorer</h3>
      <ScrollArea className="flex-grow p-1">
        {Object.keys(files).length === 0 && (
          <p className="p-2 text-xs text-muted-foreground">No repository cloned or workspace is empty.</p>
        )}
        {fileTree.map(node => (
            <FileExplorerNode 
                key={node.path}
                node={node}
                selectedFilePath={selectedFilePath}
                onFileSelect={onFileSelect}
            />
        ))}
      </ScrollArea>
    </div>
  );
}
