
// Re-export LogEntry from LogContext to ensure consistency
export type { LogEntry } from '@/context/LogContext'; 
// Re-export FileNode from FileSystemContext
export type { FileNode } from '@/context/FileSystemContext';


// The old FileSystem type is removed as FileNode from context is now used.
// export type FileSystem = {
//   [path: string]: string;
// };

export type AgentType = 'developer' | 'qa';

export type CodeSuggestion = {
  description: string;
  patch: string;
};

// This LogEntry type (previously defined here) is now sourced from LogContext
// export type LogEntry = {
//   id: string;
//   timestamp: Date;
//   message: string;
//   type: 'info' | 'error' | 'success' | 'agent';
// };

