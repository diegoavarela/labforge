import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { skills } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/skills/active — get the active skill project
export async function GET() {
  const [row] = await db.select().from(skills).where(eq(skills.isActive, true));
  if (!row) return NextResponse.json(null);
  return NextResponse.json(row);
}

// PUT /api/skills/active — set a project as active
export async function PUT(req: Request) {
  const { id } = await req.json();

  await db.update(skills).set({ isActive: false }).where(eq(skills.isActive, true));

  if (id) {
    const [row] = await db
      .update(skills)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(skills.id, id))
      .returning();
    return NextResponse.json(row);
  }

  return NextResponse.json(null);
}
