import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plugins } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// GET /api/plugins — list all plugins
export async function GET() {
  const rows = await db.select().from(plugins).orderBy(desc(plugins.updatedAt));
  return NextResponse.json(rows);
}

// POST /api/plugins — create a new plugin
export async function POST(req: Request) {
  const body = await req.json();
  const [row] = await db
    .insert(plugins)
    .values({
      pluginName: body.pluginName || "Untitled",
      data: body.data ?? {},
      isActive: body.isActive ?? false,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
