
"use client";
import { useFileSystem } from "@/context/FileSystemContext";
import { useLogs } from "@/context/LogContext";
import DiffMatchPatch from 'diff-match-patch';


export function usePatchApply() {
  const { updateFile, getFile } = useFileSystem();
  const { addLog } = useLogs();

  // Standard patch apply (replaces content entirely)
  function applyDirectPatch(patch: { path: string; newContent: string }) {
    const file = getFile(patch.path);
    if (!file || file.type !== 'file') {
      addLog({ source: 'error', message: `Patch failed: File not found or not a file at path ${patch.path}` });
      return false;
    }
    updateFile(patch.path, patch.newContent);
    addLog({ source: 'system', message: `Patch applied directly to ${patch.path}` });
    return true;
  }

  // Diff patch apply (uses diff-match-patch)
  function applyDiffPatch(filePath: string, patchString: string) {
    const file = getFile(filePath);
    if (!file || file.type !== 'file') {
      addLog({ source: 'error', message: `Diff patch failed: File not found or not a file at path ${filePath}` });
      return false;
    }
    
    const currentContent = file.content || "";
    const dmp = new DiffMatchPatch();
    try {
      const patches = dmp.patch_fromText(patchString);
      const [newText, results] = dmp.patch_apply(patches, currentContent);

      if (results.every(result => result === true)) {
        updateFile(filePath, newText as string);
        addLog({ source: 'success', message: `Diff patch applied successfully to ${filePath}.` });
        return true;
      } else {
        addLog({ source: 'error', message: `Failed to apply diff patch to ${filePath}. Some hunks may have failed.` });
        results.forEach((result, i) => {
          if (!result) addLog({ source: 'error', message: `Patch hunk ${i + 1} for ${filePath} failed.` });
        });
        return false;
      }
    } catch (e) {
      addLog({ source: 'error', message: `Error applying diff patch to ${filePath}: ${e instanceof Error ? e.message : String(e)}` });
      return false;
    }
  }

  return { applyDirectPatch, applyDiffPatch };
}
