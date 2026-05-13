import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    if (!user.emailVerified) {
      return NextResponse.json({ error: "Please verify your email before signing in." }, { status: 403 });
    }

    // Ensure UserAccount exists (backfill for users created before BD architecture)
    await prisma.userAccount.upsert({
      where:  { userId: user.id },
      create: { userId: user.id, cashBalance: 0, reservedCash: 0 },
      update: {}
    });

    await createSessionCookie({ sub: user.id, email: user.email, name: user.name });
    return NextResponse.json({ message: "Logged in" });
  } catch (err) {
    console.error("[login] error:", err);
    return NextResponse.json({ error: "Server error — please try again" }, { status: 500 });
  }
}
