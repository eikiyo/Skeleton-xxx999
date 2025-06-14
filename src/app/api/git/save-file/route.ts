
// src/app/api/git/save-file/route.ts

import { type NextRequest, NextResponse } from 'next/server';

interface SaveFilePayload {
  owner: string;         // GitHub username or org
  repo: string;          // repository name
  path: string;          // file path in repo (e.g., 'src/file.ts')
  content: string;       // new file contents (as plain string, not base64)
  message: string;       // commit message
  branch: string;        // branch to update (e.g., 'main')
  sha?: string;          // current file SHA (required for updates)
}

export async function POST(req: NextRequest) {
  // Parse request body
  let payload: SaveFilePayload;
  try {
    payload = await req.json();
  } catch (err) {
    console.error("[SaveFile API] Invalid JSON:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate input
  const { owner, repo, path, content, message, branch, sha } = payload;
  if (!owner || !repo || !path || typeof content !== 'string' || !message || !branch) { // check content is string
    console.error("[SaveFile API] Missing required fields:", payload);
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get token from env
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.error("[SaveFile API] GITHUB_TOKEN not set in environment.");
    return NextResponse.json({ error: "Server configuration error: GitHub token not set." }, { status: 500 });
  }

  // Prepare GitHub API call
  const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const apiPayload: any = {
    message,
    content: Buffer.from(content).toString('base64'), // must be base64!
    branch,
  };
  if (sha) apiPayload.sha = sha; // sha required for update

  try {
    console.log(`[SaveFile API] Attempting to save to ${githubApiUrl} on branch ${branch}`);
    const ghRes = await fetch(githubApiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(apiPayload),
    });

    const data = await ghRes.json();

    if (!ghRes.ok) {
      console.error("[SaveFile API] GitHub API error:", { status: ghRes.status, data });
      // Most errors have a .message field
      return NextResponse.json({ error: data.message || "Unknown GitHub error", details: data }, { status: ghRes.status });
    }

    console.log("[SaveFile API] File saved successfully:", { path: data?.content?.path, sha: data?.content?.sha });
    return NextResponse.json({
      message: "File saved to GitHub successfully.",
      githubResponse: data, // send full response for potential sha, etc.
    });

  } catch (error) {
    console.error("[SaveFile API] Error calling GitHub API:", error);
    const errorMessage = error instanceof Error ? error.message : "Network or unexpected error occurred";
    return NextResponse.json({ error: "Failed to call GitHub API", details: errorMessage }, { status: 500 });
  }
}

