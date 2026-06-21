import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { listSets, normalizeSet, upsertSets } from "./store";

function expectedToken() {
  const id = process.env.ADMIN_ID ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "local-dev-secret";
  return createHmac("sha256", secret).update(`${id}:${password}`).digest("hex");
}

function isAdmin(request: Request) {
  return request.headers.get("x-admin-token") === expectedToken();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  
  // FIXED: Hardcoded to exactly 5. No matter what parameter the client sends, it stays 5.
  const limit = 5;

  const { sets, total } = await listSets(page, limit);

  return NextResponse.json({
    sets,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
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