import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { preferences: true }
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id:            user.id,
    email:         user.email,
    name:          user.name,
    emailVerified: user.emailVerified,
    kycStatus:     user.kycStatus,
    theme:         user.preferences?.theme ?? "light"
  });
}

const patchSchema = z.object({
  name:  z.string().min(2).max(60).optional(),
  theme: z.enum(["dark", "light"]).optional()
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { name, theme } = parsed.data;
  if (name) await prisma.user.update({ where: { id: session.sub }, data: { name } });
  if (theme) {
    await prisma.userPreferences.upsert({
      where:  { userId: session.sub },
      create: { userId: session.sub, theme },
      update: { theme }
    });
  }

  return NextResponse.json({ message: "Updated" });
}
