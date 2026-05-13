import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  cardholderName: z.string().min(2).max(60).optional(),
  expiryMonth:    z.number().int().min(1).max(12).optional(),
  expiryYear:     z.number().int().min(2024).max(2040).optional(),
  nickname:       z.string().max(40).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = await prisma.savedCard.findUnique({ where: { id } });
  if (!card || card.userId !== session.sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });

  const now = new Date();
  const month = parsed.data.expiryMonth ?? card.expiryMonth;
  const year  = parsed.data.expiryYear  ?? card.expiryYear;
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return NextResponse.json({ error: "This card has expired." }, { status: 400 });
  }

  const updated = await prisma.savedCard.update({
    where: { id },
    data:  parsed.data,
  });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = await prisma.savedCard.findUnique({ where: { id } });
  if (!card || card.userId !== session.sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedCard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
