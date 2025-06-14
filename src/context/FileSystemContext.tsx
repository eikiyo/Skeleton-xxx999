
"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

// FileNode can be a file or folder
export type FileNode = {
  type: "file" | "folder";
  name: string;
  path: string;
  content?: string; // Only for type: file
  children?: FileNode[]; // Only for type: folder
};

type FileSystemContextType = {
  root: FileNode;
  setRoot: (root: FileNode) => void;
  getFile: (path: string) => FileNode | undefined;
  updateFile: (path: string, content: string) => void;
  addFileOrDirectory: (path: string, name: string, type: "file" | "folder", content?: string) => void;
  removeFileOrDirectory: (path: string) => void;
  initializeFileSystem: (files: Record<string, string>) => void;
};

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const initialRoot: FileNode = {
    type: "folder",
    name: "", // Root name is empty, path is "/"
    path: "/",
    children: [],
  };
  const [root, setRootInternal] = useState<FileNode>(initialRoot);

  const setRoot = useCallback((newRoot: FileNode) => {
    setRootInternal(newRoot);
  }, []);

  const findNode = useCallback((path: string, node: FileNode): FileNode | undefined => {
    if (node.path === path) return node;
    if (node.type === "folder" && node.children) {
      for (const child of node.children) {
        // Ensure path matching is correct, especially for nested lookups
        if (path.startsWith(child.path)) {
          const found = findNode(path, child);
          if (found) return found;
        }
      }
    }
    return undefined;
  }, []);

  const getFile = useCallback((path: string) => {
    return findNode(path, root);
  }, [root, findNode]);

  const updateFile = useCallback((path: string, content: string) => {
    function update(node: FileNode): FileNode {
      if (node.path === path && node.type === "file") {
        return { ...node, content };
      }
      if (node.type === "folder" && node.children) {
        return { ...node, children: node.children.map(update) };
      }
      return node;
    }
    setRootInternal(update(root));
  }, [root]);

  const addFileOrDirectory = useCallback((parentPath: string, name: string, type: "file" | "folder", content?: string) => {
    const newPath = (parentPath === "/" ? "" : parentPath) + "/" + name;
    
    const newNode: FileNode = {
        type,
        name,
        path: newPath,
        ...(type === "file" ? { content: content || "" } : { children: [] }),
    };

    function add(current: FileNode): FileNode {
        if (current.path === parentPath && current.type === "folder") {
            // Check for duplicates
            if (current.children?.find(child => child.name === name)) {
                // Optionally, update if exists or throw error/log warning
                console.warn(`Item named "${name}" already exists in "${parentPath}". Skipping add.`);
                return current; 
            }
            return { ...current, children: [...(current.children || []), newNode].sort((a, b) => a.name.localeCompare(b.name)) };
        }
        if (current.type === "folder" && current.children) {
            return { ...current, children: current.children.map(child => add(child)) };
        }
        return current;
    }
    setRootInternal(add(root));
  }, [root]);


  const removeFileOrDirectory = useCallback((path: string) => {
    function remove(node: FileNode): FileNode {
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: node.children.filter((child) => child.path !== path).map(remove),
        };
      }
      return node;
    }
    setRootInternal(remove(root));
  }, [root]);
  
  const initializeFileSystem = useCallback((files: Record<string, string>) => {
    let newRoot: FileNode = { type: "folder", name: "", path: "/", children: [] };

    function addNodeToTree(currentRoot: FileNode, filePath: string, fileContent: string): FileNode {
        const parts = filePath.split('/').filter(p => p);
        let currentNode = currentRoot;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLastPart = i === parts.length - 1;
            const childPath = (currentNode.path === "/" ? "" : currentNode.path) + "/" + part;

            let childNode = currentNode.children?.find(child => child.name === part);

            if (!childNode) {
                childNode = {
                    name: part,
                    path: childPath,
                    type: isLastPart ? "file" : "folder",
                    ...(isLastPart ? { content: fileContent } : { children: [] }),
                };
                if (!currentNode.children) currentNode.children = [];
                currentNode.children.push(childNode);
                currentNode.children.sort((a, b) => a.name.localeCompare(b.name));
            } else if (childNode.type === "file" && !isLastPart) {
                // This case should ideally not happen if paths are unique for files/folders
                console.warn(`Path conflict: ${childPath} is a file but treated as a folder.`);
            }
            currentNode = childNode;
        }
        return currentRoot;
    }

    Object.entries(files).forEach(([path, content]) => {
        newRoot = addNodeToTree(newRoot, path, content);
    });
    setRootInternal(newRoot);
  }, []);


  return (
    <FileSystemContext.Provider
      value={{ root, setRoot, getFile, updateFile, addFileOrDirectory, removeFileOrDirectory, initializeFileSystem }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const ctx = useContext(FileSystemContext);
  if (!ctx) throw new Error("useFileSystem must be used within FileSystemProvider");
  return ctx;
}
