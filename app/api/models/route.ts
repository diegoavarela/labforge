import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.LABFORGE_ANTHROPIC_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch models" }, { status: res.status });
    }

    const data = await res.json();
    const models = data.data.map((m: { id: string; display_name: string }) => ({
      id: m.id,
      name: m.display_name,
    }));

    return NextResponse.json(models);
  } catch {
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
