import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plugins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/plugins/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(plugins).where(eq(plugins.id, id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/plugins/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(plugins)
    .set({
      pluginName: body.pluginName,
      data: body.data,
      isActive: body.isActive,
      updatedAt: new Date(),
    })
    .where(eq(plugins.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// DELETE /api/plugins/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.delete(plugins).where(eq(plugins.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
