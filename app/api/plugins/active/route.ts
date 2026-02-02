import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plugins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/plugins/active — get the active plugin
export async function GET() {
  const [row] = await db.select().from(plugins).where(eq(plugins.isActive, true));
  if (!row) return NextResponse.json(null);
  return NextResponse.json(row);
}

// PUT /api/plugins/active — set a plugin as active (deactivates others)
export async function PUT(req: Request) {
  const { id } = await req.json();

  // Deactivate all
  await db.update(plugins).set({ isActive: false }).where(eq(plugins.isActive, true));

  if (id) {
    // Activate the selected one
    const [row] = await db
      .update(plugins)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(plugins.id, id))
      .returning();
    return NextResponse.json(row);
  }

  return NextResponse.json(null);
}
