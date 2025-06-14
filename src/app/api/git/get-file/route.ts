
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const path = searchParams.get('path');
  const branch = searchParams.get('branch') || 'main';

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: "Missing required params: owner, repo, and path are required." }, { status: 400 });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.error("[API /git/get-file] GITHUB_TOKEN not set in environment.");
    return NextResponse.json({ error: "Server configuration error: GitHub token not set." }, { status: 500 });
  }

  const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
  
  try {
    const res = await fetch(githubUrl, {
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const data = await res.json(); // Attempt to parse JSON regardless of res.ok, for better error details

    if (!res.ok) {
      console.error(`[API /git/get-file] GitHub API error for ${path}:`, { status: res.status, data });
      return NextResponse.json({ error: data.message || `GitHub API error (${res.status}) while fetching ${path}.`, details: data }, { status: res.status });
    }

    if (data.type !== 'file') {
      console.warn(`[API /git/get-file] Requested path ${path} is not a file. Type: ${data.type}`);
      return NextResponse.json({ error: `Requested path '${path}' is not a file. Type: ${data.type}`}, { status: 400 });
    }
    
    if (typeof data.content !== 'string') {
        console.error(`[API /git/get-file] No content returned for file ${path}`, data);
        return NextResponse.json({ error: `No content found for file '${path}'. It might be a submodule or an empty file.`, details: data }, { status: 404 });
    }


    const decodedContent = Buffer.from(data.content, 'base64').toString('utf8');

    return NextResponse.json({
      content: decodedContent,
      sha: data.sha,
      name: data.name,
      path: data.path, // Return path to confirm
      size: data.size,
      html_url: data.html_url,
      download_url: data.download_url,
      // fullFileObject: data, // Optionally return the whole GitHub object
    });

  } catch (error) {
    console.error(`[API /git/get-file] Unexpected error fetching ${path}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Network or unexpected error occurred";
    return NextResponse.json({ error: "Failed to call GitHub API to get file content.", details: errorMessage }, { status: 500 });
  }
}
