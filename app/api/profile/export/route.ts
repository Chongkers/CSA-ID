import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { exportAccount } from "@/lib/account-data";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await exportAccount(getDb(), account.user.id);
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="digital-profile-export.json"', "cache-control": "no-store" } });
}
