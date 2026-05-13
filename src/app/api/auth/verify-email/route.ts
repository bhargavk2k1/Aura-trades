import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (record.usedAt) return NextResponse.json({ error: "Token already used" }, { status: 400 });
  if (record.expiresAt < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 400 });

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { token }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } })
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/login?verified=1`);
}
