import { NextResponse } from "next/server";
import { isClientSortField, listClients } from "@/lib/clients";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { clientCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const sortByParam = url.searchParams.get("sortBy");
  const sortBy = isClientSortField(sortByParam) ? sortByParam : "lastActivity";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  const clients = await listClients({ search, sortBy, order, includeArchived });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const body = await request.json().catch(() => null);
  const parsed = clientCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const client = await prisma.client.create({ data: parsed.data });
  return NextResponse.json(client, { status: 201 });
}
