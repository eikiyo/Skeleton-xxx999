
import { type NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGitOptions } from 'simple-git';
import fs from 'fs/promises'; // Use promises version for async/await
import path from 'path';

// Define a type for the file objects expected in the request
interface GitFile {
  path: string; // Relative path within the repo
  content: string;
}

export async function POST(req: NextRequest) {
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    console.error('[GitAPI] Invalid JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, repoUrl, token, commitMessage, files } = requestBody as {
    action: string;
    repoUrl?: string;
    token?: string;
    commitMessage?: string;
    files?: GitFile[];
  };

  const repoPath = '/tmp/codepilot-repo'; // Vercel allows writing to /tmp

  try {
    // Ensure /tmp/codepilot-repo exists for operations other than clone, or clean it for clone
    if (action !== 'clone') {
      try {
        await fs.access(repoPath);
      } catch {
        // If directory doesn't exist and action is not clone, it's an error.
        // Or, for a stateless approach, clone might be implicitly needed first,
        // but the current design separates clone.
        console.warn(`[GitAPI] Repo path ${repoPath} does not exist for action: ${action}. This might be expected if not cloned yet.`);
        // Depending on desired behavior, you might return an error or proceed if action can handle it.
      }
    }


    if (action === 'clone') {
      if (!repoUrl) {
        return NextResponse.json({ error: 'Repository URL is required for clone' }, { status: 400 });
      }
      // Clean up existing repo directory if it exists for a fresh clone
      try {
        await fs.rm(repoPath, { recursive: true, force: true });
      } catch (e) {
        // Ignore error if directory doesn't exist
      }
      await fs.mkdir(repoPath, { recursive: true });
      
      const gitOptions: Partial<SimpleGitOptions> = {
        baseDir: process.cwd(), // Required for simple-git
        binary: 'git',
        maxConcurrentProcesses: 6,
      };
      const git = simpleGit(gitOptions);
      
      let cloneUrl = repoUrl;
      // Basic token injection for HTTPS, more robust solutions (like credential helpers) are complex for serverless
      if (token && repoUrl.startsWith('https://')) {
        const urlParts = new URL(repoUrl);
        cloneUrl = `${urlParts.protocol}//oauth2:${token}@${urlParts.host}${urlParts.pathname}`;
      } else if (token) {
         console.warn("[GitAPI] Token provided but URL is not HTTPS, token injection skipped. SSH Key auth needed for SSH URLs.");
      }


      console.log(`[GitAPI] Cloning ${repoUrl} into ${repoPath}`);
      await git.clone(cloneUrl, repoPath, ['--depth=1']); // Shallow clone
      console.log(`[GitAPI] Cloned ${repoUrl} successfully.`);
      
      // After cloning, list files to return to frontend
      const clonedFilesRaw = await fs.readdir(repoPath, { withFileTypes: true, recursive: true });
      const clonedFilePaths = clonedFilesRaw
        .filter(dirent => dirent.isFile())
        .map(dirent => path.relative(repoPath, path.join(dirent.path, dirent.name)));

      return NextResponse.json({ message: "Repository cloned successfully.", files: clonedFilePaths });
    }

    if (action === 'commit_and_push') { // Changed action name to be more descriptive
      if (!commitMessage || !files || files.length === 0) {
        return NextResponse.json({ error: 'Commit message and files are required for commit' }, { status: 400 });
      }

      // Ensure repoPath exists (it should if previously cloned in the same session/flow)
      // For serverless, this is tricky as /tmp is ephemeral. This assumes clone happened.
      try {
        await fs.access(repoPath);
      } catch (e) {
         return NextResponse.json({ error: `Repository not found at ${repoPath}. Please clone first.` }, { status: 400 });
      }
      
      const git = simpleGit(repoPath);

      for (const file of files) {
        const filePath = path.join(repoPath, file.path);
        const dirName = path.dirname(filePath);
        await fs.mkdir(dirName, { recursive: true }); // Ensure directory exists
        await fs.writeFile(filePath, file.content);
        console.log(`[GitAPI] Wrote file ${file.path}`);
      }
      
      await git.add('.');
      console.log('[GitAPI] Added files to staging.');
      await git.commit(commitMessage);
      console.log(`[GitAPI] Committed with message: "${commitMessage}"`);
      
      // Determine current branch for push (simple-git doesn't have a straightforward currentBranch like CLI)
      // This is a common way to get the current branch name
      const currentBranch = (await git.branchLocal()).current || 'main'; // Default to main if somehow not found

      // For pushing with token via HTTPS, configure remote URL or use http.extraHeader
      // simple-git handles http.extraHeader from clone usually, but for push, ensure remote is set up correctly.
      // If the clone URL already had the token, this might just work. Otherwise, more config needed for private repos.
      // A common approach is to re-set the remote URL with the token for the push.
      const remoteUrl = (await git.getRemotes(true)).find(remote => remote.name === 'origin')?.refs.push;
      if (remoteUrl && token && remoteUrl.startsWith('https://')) {
        const urlParts = new URL(remoteUrl);
        const pushUrl = `${urlParts.protocol}//oauth2:${token}@${urlParts.host}${urlParts.pathname}`;
        // Temporarily set remote for push, or ensure clone URL persists this auth
         try {
            await git.removeRemote('origin-temp-push'); // Clean up if exists
         } catch {}
         await git.addRemote('origin-temp-push', pushUrl);
         await git.push(['origin-temp-push', currentBranch]);
         await git.removeRemote('origin-temp-push'); // Clean up
         console.log(`[GitAPI] Pushed to ${currentBranch} on origin (using temporary remote).`);
      } else if (token) {
        // If not HTTPS or remote URL not easily parsable, this basic push might fail for private repos.
        // For public repos or SSH key based auth (configured on Vercel), this might work directly.
        console.warn("[GitAPI] Attempting push without explicit token re-injection for remote. May fail for private HTTPS repos if clone auth didn't persist for push.");
        await git.push('origin', currentBranch);
        console.log(`[GitAPI] Pushed to ${currentBranch} on origin.`);
      } else {
        // No token, assume public repo or SSH key auth
        await git.push('origin', currentBranch);
        console.log(`[GitAPI] Pushed to ${currentBranch} on origin (no token).`);
      }

      return NextResponse.json({ message: "Changes committed and pushed successfully." });
    }

    return NextResponse.json({ error: 'Invalid Git action specified' }, { status: 400 });

  } catch (err: any) {
    console.error('[GitAPI] Error:', err);
    // Try to provide a more specific error message from simple-git if available
    const errorMessage = err?.message || String(err);
    return NextResponse.json({ error: `Git operation failed: ${errorMessage.slice(0, 500)}` }, { status: 500 });
  }
}
