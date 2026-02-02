import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const res = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100",
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch repos" },
      { status: res.status }
    );
  }

  const data = await res.json();
  const repos = data.map((r: { full_name: string; private: boolean; html_url: string }) => ({
    full_name: r.full_name,
    private: r.private,
    html_url: r.html_url,
  }));

  return NextResponse.json({ repos });
}
