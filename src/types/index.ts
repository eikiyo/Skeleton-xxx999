export type FileSystem = {
  [path: string]: string;
};

export type LogEntry = {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success' | 'agent';
};

export type AgentType = 'developer' | 'qa';

export type CodeSuggestion = {
  description: string;
  patch: string;
};
