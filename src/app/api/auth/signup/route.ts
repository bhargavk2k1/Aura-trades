import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const passwordHash = await hashPassword(password);

    const autoVerify = !process.env.SMTP_HOST;
    const user = await prisma.user.create({
      data: { name, email, passwordHash, emailVerified: autoVerify }
    });

    await Promise.all([
      prisma.userPreferences.create({ data: { userId: user.id } }),
      prisma.userAccount.create({ data: { userId: user.id, cashBalance: 0, reservedCash: 0 } })
    ]);

    if (autoVerify) {
      return NextResponse.json({ message: "Account created. You can sign in now.", autoVerified: true }, { status: 201 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tokenRecord = await prisma.emailVerificationToken.create({
      data: { userId: user.id, expiresAt }
    });

    await sendVerificationEmail(email, tokenRecord.token);

    return NextResponse.json({ message: "Account created. Check your email to verify." }, { status: 201 });
  } catch (err) {
    console.error("[signup] error:", err);
    return NextResponse.json({ error: "Server error — please try again" }, { status: 500 });
  }
}
