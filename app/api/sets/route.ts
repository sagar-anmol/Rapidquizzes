import { NextResponse } from "next/server";
import { listSets, normalizeSet, upsertSets } from "./store";
import { getRoleForToken } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function isAdminRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  try {
    return (await getRoleForToken(token)) === "admin";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limitParam = Math.max(1, Number(searchParams.get("limit") ?? "5"));
  const limit = Math.min(50, limitParam);

  const { sets, total } = await listSets(page, limit);

  return NextResponse.json(
    {
      sets,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" }
    }
  );
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const incoming = Array.isArray(body) ? body : [body];

  try {
    const newSets = incoming.map(normalizeSet);
    await upsertSets(newSets);

    return NextResponse.json({ saved: newSets.length, sets: newSets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid set JSON" },
      { status: 400 }
    );
  }
}
