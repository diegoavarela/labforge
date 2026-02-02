import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

interface PushPayload {
  repoName: string;
  files: { path: string; content: string }[];
  isPrivate: boolean;
  existingRepo?: boolean;
}

async function githubFetch(
  url: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  return res;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = session.accessToken;
  const body: PushPayload = await req.json();
  const { repoName, files, isPrivate, existingRepo } = body;

  if (!repoName || !files?.length) {
    return NextResponse.json(
      { error: "repoName and files are required" },
      { status: 400 }
    );
  }

  try {
    let owner: string;
    let repo: string;

    if (existingRepo && repoName.includes("/")) {
      [owner, repo] = repoName.split("/");
    } else {
      // Get authenticated user
      const userRes = await githubFetch("https://api.github.com/user", token);
      if (!userRes.ok) {
        return NextResponse.json(
          { error: "Failed to get GitHub user" },
          { status: 401 }
        );
      }
      const user = await userRes.json();
      owner = user.login;
      repo = repoName;

      if (!existingRepo) {
        // Create repository
        const createRes = await githubFetch(
          "https://api.github.com/user/repos",
          token,
          {
            method: "POST",
            body: JSON.stringify({
              name: repo,
              private: isPrivate,
              auto_init: true,
            }),
          }
        );

        if (!createRes.ok) {
          const err = await createRes.json();
          return NextResponse.json(
            {
              error:
                err.errors?.[0]?.message ||
                err.message ||
                "Failed to create repo",
            },
            { status: createRes.status }
          );
        }

        // Wait for repo initialization
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const repoPath = `${owner}/${repo}`;
    const apiBase = `https://api.github.com/repos/${repoPath}`;

    // Get default branch ref
    let baseSha: string;
    let baseTreeSha: string;

    const refRes = await githubFetch(
      `${apiBase}/git/ref/heads/main`,
      token
    );

    if (refRes.ok) {
      const refData = await refRes.json();
      baseSha = refData.object.sha;

      const commitRes = await githubFetch(
        `${apiBase}/git/commits/${baseSha}`,
        token
      );
      const commitData = await commitRes.json();
      baseTreeSha = commitData.tree.sha;
    } else {
      // Try master branch
      const masterRes = await githubFetch(
        `${apiBase}/git/ref/heads/master`,
        token
      );
      if (masterRes.ok) {
        const masterData = await masterRes.json();
        baseSha = masterData.object.sha;
        const commitRes = await githubFetch(
          `${apiBase}/git/commits/${baseSha}`,
          token
        );
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree.sha;
      } else {
        return NextResponse.json(
          { error: "Could not find default branch" },
          { status: 400 }
        );
      }
    }

    // Create blobs for all files
    const blobPromises = files.map(async (file) => {
      const blobRes = await githubFetch(`${apiBase}/git/blobs`, token, {
        method: "POST",
        body: JSON.stringify({
          content: file.content,
          encoding: "utf-8",
        }),
      });
      const blobData = await blobRes.json();
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.sha,
      };
    });

    const treeItems = await Promise.all(blobPromises);

    // Create tree
    const treeRes = await githubFetch(`${apiBase}/git/trees`, token, {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });
    const treeData = await treeRes.json();

    // Create commit
    const commitRes = await githubFetch(`${apiBase}/git/commits`, token, {
      method: "POST",
      body: JSON.stringify({
        message: "Add plugin files via Plugin Forge",
        tree: treeData.sha,
        parents: [baseSha],
      }),
    });
    const newCommit = await commitRes.json();

    // Update ref
    const branch = refRes.ok ? "main" : "master";
    await githubFetch(`${apiBase}/git/refs/heads/${branch}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommit.sha }),
    });

    return NextResponse.json({
      url: `https://github.com/${repoPath}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to push to GitHub",
      },
      { status: 500 }
    );
  }
}
