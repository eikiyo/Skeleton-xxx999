
"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

// FileNode can be a file or folder
export type FileNode = {
  type: "file" | "folder";
  name: string;
  path: string;
  content?: string; // Only for type: file
  children?: FileNode[]; // Only for type: folder
  sha?: string; // Optional: SHA for GitHub file versioning
};

type FileSystemContextType = {
  root: FileNode;
  setRoot: (root: FileNode) => void;
  getFile: (path: string) => FileNode | undefined;
  updateFile: (path: string, content: string) => void;
  updateFileDetails: (path: string, details: { content?: string; sha?: string }) => void;
  addFileOrDirectory: (parentPath: string, name: string, type: "file" | "folder", content?: string) => void;
  removeFileOrDirectory: (path: string) => void;
  initializeFileSystem: (files: Record<string, { content: string; sha?: string }>) => void;
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
        if (path.startsWith(child.path + (child.type === 'folder' && child.path !== '/' ? '/' : ''))) { 
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
        return { ...node, children: node.children.map(update).sort((a, b) => a.name.localeCompare(b.name)) };
      }
      return node;
    }
    setRootInternal(prevRoot => update(prevRoot));
  }, []);

  const updateFileDetails = useCallback((path: string, details: { content?: string; sha?: string }) => {
    function update(node: FileNode): FileNode {
      if (node.path === path && node.type === "file") {
        return { 
          ...node, 
          ...(details.content !== undefined && { content: details.content }),
          ...(details.sha !== undefined && { sha: details.sha }) 
        };
      }
      if (node.type === "folder" && node.children) {
        return { ...node, children: node.children.map(update).sort((a,b) => a.name.localeCompare(b.name)) };
      }
      return node;
    }
    setRootInternal(prevRoot => update(prevRoot));
  }, []);


  const addFileOrDirectory = useCallback((parentPath: string, name: string, type: "file" | "folder", content?: string) => {
    const newPath = (parentPath === "/" ? "" : parentPath) + "/" + name;
    
    const newNodeData: FileNode = {
        type,
        name,
        path: newPath,
        ...(type === "file" ? { content: content || "" } : { children: [] }),
    };

    setRootInternal(prevRoot => {
        function add(current: FileNode): FileNode {
            if (current.path === parentPath && current.type === "folder") {
                if (current.children?.find(child => child.name === name)) {
                    console.warn(`Item named "${name}" already exists in "${parentPath}". Skipping add.`);
                    return current; 
                }
                const newChildren = [...(current.children || []), newNodeData].sort((a,b) => {
                    if (a.type === 'folder' && b.type === 'file') return -1;
                    if (a.type === 'file' && b.type === 'folder') return 1;
                    return a.name.localeCompare(b.name);
                });
                return { ...current, children: newChildren };
            }
            if (current.type === "folder" && current.children) {
                return { ...current, children: current.children.map(child => add(child)).sort((a,b) => {
                    if (a.type === 'folder' && b.type === 'file') return -1;
                    if (a.type === 'file' && b.type === 'folder') return 1;
                    return a.name.localeCompare(b.name);
                }) };
            }
            return current;
        }
        return add(prevRoot);
    });
  }, []);


  const removeFileOrDirectory = useCallback((pathToRemove: string) => {
    setRootInternal(prevRoot => {
        function remove(node: FileNode): FileNode {
            if (node.type === "folder" && node.children) {
                return {
                    ...node,
                    children: node.children.filter((child) => child.path !== pathToRemove).map(remove).sort((a,b) => {
                        if (a.type === 'folder' && b.type === 'file') return -1;
                        if (a.type === 'file' && b.type === 'folder') return 1;
                        return a.name.localeCompare(b.name);
                    }),
                };
            }
            return node;
        }
        // Special case: removing a direct child of the root
        if (prevRoot.path === "/" && prevRoot.children?.some(child => child.path === pathToRemove)) {
             return {
                ...prevRoot,
                children: prevRoot.children.filter(child => child.path !== pathToRemove).sort((a,b) => {
                    if (a.type === 'folder' && b.type === 'file') return -1;
                    if (a.type === 'file' && b.type === 'folder') return 1;
                    return a.name.localeCompare(b.name);
                }),
             }
        }
        return remove(prevRoot);
    });
  }, []);
  
  const initializeFileSystem = useCallback((files: Record<string, { content: string; sha?: string }>) => {
    let newRootNode: FileNode = { type: "folder", name: "", path: "/", children: [] };

    Object.entries(files).forEach(([filePath, fileData]) => {
        const parts = filePath.split('/').filter(p => p); 
        let currentNode = newRootNode;

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
                };
                if (isLastPart) {
                    (childNode as FileNode).content = fileData.content;
                    if (fileData.sha) {
                        (childNode as FileNode).sha = fileData.sha;
                    }
                } else {
                    (childNode as FileNode).children = [];
                }
                
                if (!currentNode.children) currentNode.children = [];
                currentNode.children.push(childNode);
                currentNode.children.sort((a, b) => {
                    if (a.type === 'folder' && b.type === 'file') return -1;
                    if (a.type === 'file' && b.type === 'folder') return 1;
                    return a.name.localeCompare(b.name);
                });
            } else if (childNode.type === "file" && !isLastPart) {
                console.warn(`Path conflict: ${childPath} is a file but should be a folder for ${filePath}.`);
            }
            currentNode = childNode; 
        }
    });
    setRootInternal(newRootNode);
  }, []);


  return (
    <FileSystemContext.Provider
      value={{ root, setRoot, getFile, updateFile, updateFileDetails, addFileOrDirectory, removeFileOrDirectory, initializeFileSystem }}
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
