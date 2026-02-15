import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { skills } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(skills).orderBy(desc(skills.updatedAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [row] = await db
    .insert(skills)
    .values({
      name: body.pluginName || body.name || "Untitled",
      data: body.data ?? {},
      isActive: body.isActive ?? false,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
