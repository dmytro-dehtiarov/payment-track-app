import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { paymentUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = paymentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payment = await prisma.payment.update({ where: { id }, data: parsed.data });
  return NextResponse.json(payment);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.payment.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
