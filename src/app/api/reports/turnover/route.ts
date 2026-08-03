import { NextResponse } from "next/server";
import { getTurnoverReport } from "@/lib/report";
import { requireSessionUser } from "@/lib/session";
import { turnoverQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const parsed = turnoverQuerySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    clientId: url.searchParams.get("clientId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "'from' and 'to' (YYYY-MM-DD) are required" }, { status: 400 });
  }

  const report = await getTurnoverReport(parsed.data);
  return NextResponse.json(report);
}
