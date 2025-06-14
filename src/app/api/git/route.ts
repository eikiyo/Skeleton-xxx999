
// src/app/api/git/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import simpleGit, { type SimpleGitOptions } from 'simple-git';
import fs from 'fs/promises'; // Use promises version of fs
import path from 'path';

const REPO_DIR_NAME = 'codepilot-repo'; // Define a consistent directory name

async function getRepoPath(): Promise<string> {
  // In serverless environments, /tmp is often the only writable directory.
  // Using a subdirectory within /tmp for our repo.
  const repoPath = path.join('/tmp', REPO_DIR_NAME);
  try {
    await fs.mkdir(repoPath, { recursive: true }); // Ensure directory exists
  } catch (e) {
    // Ignore if directory already exists, rethrow other errors
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
      console.error(`[Git API] Error creating repo directory ${repoPath}:`, e);
      throw e; 
    }
  }
  return repoPath;
}

async function listFilesRecursive(dir: string, relativeTo: string): Promise<Record<string,string>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files: Record<string,string> = {};
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '.git') continue; // Skip .git directory

    const relativePath = path.relative(relativeTo, fullPath);
    if (entry.isDirectory()) {
      files = { ...files, ...(await listFilesRecursive(fullPath, relativeTo)) };
    } else {
      // For MVP, we'll return empty content.
      // To get actual content: files[relativePath] = await fs.readFile(fullPath, 'utf-8');
      files[relativePath] = ""; // Placeholder content
    }
  }
  return files;
}


export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error('[Git API] Invalid JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, repoUrl, token, commitMessage, files, branch = 'main' } = payload;
  const repoPath = await getRepoPath();

  const options: Partial<SimpleGitOptions> = {
    baseDir: repoPath,
    binary: 'git',
    maxConcurrentProcesses: 1,
  };

  // Configure authentication for HTTPS URLs if a token is provided
  // simple-git uses GIT_ASKPASS or credential helpers for complex auth.
  // For token-based HTTPS, it's often simpler to embed in URL or use http.extraHeader.
  let effectiveRepoUrl = repoUrl;
  if (token && repoUrl && repoUrl.startsWith('https://')) {
     // This is a common way, but be cautious if repoUrl is logged.
     // effectiveRepoUrl = repoUrl.replace('https://', `https://oauth2:${token}@`);
     // A safer approach for simple-git with https might be to configure http.extraHeader
     // However, this needs careful setup. For now, relying on token in URL if https.
  }


  try {
    if (action === 'clone') {
      if (!repoUrl) {
        return NextResponse.json({ error: "Repository URL is required for clone." }, { status: 400 });
      }
      // Clear previous repo if it exists to ensure a fresh clone
      try {
        const stats = await fs.stat(repoPath);
        if (stats.isDirectory()) {
          await fs.rm(repoPath, { recursive: true, force: true });
          await fs.mkdir(repoPath, { recursive: true }); // Recreate after rm
        }
      } catch (e : any) {
        if (e.code !== 'ENOENT') throw e; // if dir not found, it's fine
         await fs.mkdir(repoPath, { recursive: true }); // Ensure it exists if ENOENT
      }
      
      console.log(`[Git API] Cloning ${repoUrl} into ${repoPath}`);
      const git = simpleGit(options); // Initialize git for the specific repoPath AFTER ensuring it's clean
      
      const cloneOptions: string[] = ['--depth', '1'];
      if (token) {
        // For simple-git, configuring auth might need specific setup like using credential helpers
        // or embedding token in URL (carefully).
        // A common way for https is: effectiveRepoUrl = repoUrl.replace('https://', `https://oauth2:${token}@`);
        // Or for more robust solution use a credential helper or ssh agent.
        // For this example, if token is provided, we assume it's for an https URL and will be handled by git's config.
        // It's often better to configure git credential helper outside the app.
        // We can try setting http.extraHeader for this specific clone
        // This is more secure than embedding in URL directly IF simple-git supports it well this way
        cloneOptions.push(`--config`, `http.extraHeader=AUTHORIZATION: bearer ${token}`);
      }

      await git.clone(effectiveRepoUrl, repoPath, cloneOptions); // Clone into the baseDir itself
      
      const clonedFiles = await listFilesRecursive(repoPath, repoPath);
      console.log(`[Git API] Cloned repo. Files: ${Object.keys(clonedFiles).length}`);
      return NextResponse.json({ message: "Repository cloned successfully.", files: clonedFiles });
    }

    if (action === 'commit_and_push') {
      if (!files || !Array.isArray(files)) {
        return NextResponse.json({ error: "Files array is required for commit." }, { status: 400 });
      }
      const git = simpleGit(options); // Operate within the existing cloned repo

      // Write file updates to the temporary directory
      for (const file of files) {
        if (typeof file.path !== 'string' || typeof file.content !== 'string') {
          console.warn('[Git API] Skipping invalid file object:', file);
          continue;
        }
        const filePath = path.join(repoPath, file.path);
        const dirName = path.dirname(filePath);
        await fs.mkdir(dirName, { recursive: true }); // Ensure directory exists
        await fs.writeFile(filePath, file.content);
        console.log(`[Git API] Wrote file ${file.path}`);
      }

      await git.add('.');
      console.log('[Git API] Added files to stage.');
      
      const commitResult = await git.commit(commitMessage || 'Update via CodePilot');
      console.log('[Git API] Committed changes:', commitResult);

      // For pushing with token, git needs to be configured to use the token.
      // This can be complex with simple-git directly without credential helpers.
      // One method for HTTPS:
      const pushOptions: Record<string, null|string> = {};
      if (token && repoUrl.startsWith('https://')) {
        // This is a simplified way; real-world scenarios might need more robust auth.
        // Ensure your remote 'origin' is set up correctly or specify the full repoUrl with auth.
        // Or, configure git globally/locally to use a credential helper that supplies the token.
         // pushOptions['--repo'] = repoUrl.replace('https://', `https://oauth2:${token}@`);
         // Or rely on pre-configured git credential store or ssh agent for auth.
         // If using SSH, ensure SSH keys are set up on the server.
      }
      
      // Assuming 'origin' is the default remote and 'branch' is the target branch (e.g., 'main')
      await git.push('origin', branch, pushOptions);
      console.log(`[Git API] Pushed changes to origin/${branch}.`);
      return NextResponse.json({ message: "Changes committed and pushed successfully." });
    }

    return NextResponse.json({ error: 'Invalid Git action specified.' }, { status: 400 });

  } catch (err: any) {
    console.error('[Git API] Error during Git operation:', err);
    // Attempt to clear the repo directory on critical failure to allow retry
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('[Git API] Error cleaning up repo directory after failure:', cleanupError);
    }
    return NextResponse.json({ error: err.message || 'Git operation failed.' , details: err.stack }, { status: 500 });
  }
}
