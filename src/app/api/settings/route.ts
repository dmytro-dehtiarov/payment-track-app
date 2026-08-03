import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { settingsUpdateSchema } from "@/lib/validation";

function omitPasswordHash(settings: {
  id: string;
  theme: string;
  currencySymbol: string;
  language: string;
  updatedAt: Date;
  passwordHash: string;
}) {
  return {
    id: settings.id,
    theme: settings.theme,
    currencySymbol: settings.currencySymbol,
    language: settings.language,
    updatedAt: settings.updatedAt,
  };
}

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    return NextResponse.json({ error: "Settings not initialized" }, { status: 500 });
  }

  return NextResponse.json(omitPasswordHash(settings));
}

export async function PATCH(request: Request) {
  const user = await requireSessionUser(request);
  if (user instanceof NextResponse) return user;

  const body = await request.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const existing = await prisma.settings.findFirst();
  if (!existing) {
    return NextResponse.json({ error: "Settings not initialized" }, { status: 500 });
  }

  const settings = await prisma.settings.update({ where: { id: existing.id }, data: parsed.data });
  return NextResponse.json(omitPasswordHash(settings));
}
