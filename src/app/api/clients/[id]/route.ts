import { NextResponse } from "next/server";
import { getClientDetail } from "@/lib/clients";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { clientUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const client = await getClientDetail(id);

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = clientUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = await prisma.client.update({ where: { id }, data: parsed.data });
  return NextResponse.json(client);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.client.update({ where: { id }, data: { archived: true } });
  return new NextResponse(null, { status: 204 });
}
