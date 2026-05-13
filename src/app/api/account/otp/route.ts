import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  purpose:       z.enum(["deposit", "withdrawal"]),
  amount:        z.number().positive().max(10_000_000),
  meta:          z.string().max(500).optional(),
});

const verifySchema = z.object({
  otpId:  z.string(),
  code:   z.string().length(6),
});

// ── POST /api/account/otp  → generate & "send" OTP ───────────────────────────
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { purpose, amount, meta } = parsed.data;

  // Invalidate any existing unused OTPs for this user + purpose
  await prisma.paymentOtp.updateMany({
    where: { userId: user.id, purpose, usedAt: null },
    data:  { usedAt: new Date() },
  });

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const otp = await prisma.paymentOtp.create({
    data: { userId: user.id, code, purpose, amount, meta: meta ?? "", expiresAt },
  });

  // In production: send OTP via SMS/email here.
  // For now: return the code directly (demo mode).
  // When you integrate Resend/Twilio, remove `code` from the response.
  const isDemo = !process.env.RESEND_API_KEY;

  return NextResponse.json({
    otpId:   otp.id,
    email:   user.email,
    expires: expiresAt,
    // Only expose code in demo mode — remove this in production with real email/SMS
    ...(isDemo ? { demoCode: code } : {}),
    message: isDemo
      ? `Demo mode: your OTP is shown below. In production it would be sent to ${user.email}.`
      : `OTP sent to ${user.email}. Valid for 10 minutes.`,
  });
}

// ── PUT /api/account/otp  → verify OTP and execute transaction ────────────────
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

  const { otpId, code } = parsed.data;

  const otp = await prisma.paymentOtp.findUnique({ where: { id: otpId } });

  if (!otp || otp.userId !== user.id) {
    return NextResponse.json({ error: "OTP not found." }, { status: 404 });
  }
  if (otp.usedAt) {
    return NextResponse.json({ error: "OTP already used." }, { status: 400 });
  }
  if (otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "OTP expired. Please request a new one." }, { status: 400 });
  }
  if (otp.code !== code) {
    return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
  }

  // Mark OTP as used
  await prisma.paymentOtp.update({ where: { id: otpId }, data: { usedAt: new Date() } });

  // Execute the transaction
  const account = await prisma.userAccount.findUnique({ where: { userId: user.id } });
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const { purpose, amount } = otp;
  const meta = otp.meta ? JSON.parse(otp.meta) as { method?: string; label?: string } : {};

  if (purpose === "withdrawal" && account.cashBalance - account.reservedCash < amount) {
    return NextResponse.json({ error: "Insufficient available balance." }, { status: 422 });
  }

  const newBalance = purpose === "deposit"
    ? account.cashBalance + amount
    : account.cashBalance - amount;

  await prisma.$transaction([
    prisma.userAccount.update({
      where: { id: account.id },
      data:  { cashBalance: newBalance },
    }),
    prisma.fundTransaction.create({
      data: {
        accountId:    account.id,
        type:         purpose,
        amount,
        balanceAfter: newBalance,
        status:       "completed",
        reference:    meta.label ?? (purpose === "deposit" ? "Bank deposit" : "Bank withdrawal"),
        note:         "Verified via OTP",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, newBalance });
}
