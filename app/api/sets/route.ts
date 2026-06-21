import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { listSets, normalizeSet, upsertSets } from "./store";

// FORCE NEXT.JS TO EVALUATE THIS ROUTE FRESH EVERY TIME (NO CACHING)
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const referer = request.headers.get("referer") || "";
  
  // Permanent production domain safety checkpoint
  const allowedHost = "www.modhub.eu.org";

  // BULLETPROOF ORIGIN SECURITY GATE:
  // Direct browser link access or external site frames are completely rejected.
  // Authenticated scrapper scripts/admin sessions are automatically bypassed.
  if (!isAdmin(request)) {
    if (!referer || !referer.includes(allowedHost)) {
      return NextResponse.json(
        { error: "Access Denied. Direct data access outside the application environment is forbidden." },
        { 
          status: 403,
          headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } 
        }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 5;

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