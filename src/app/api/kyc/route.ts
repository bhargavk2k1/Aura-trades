import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fullName:    z.string().min(2).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  address:     z.string().min(5).max(300),
  idType:      z.enum(["passport", "drivers_license", "national_id"]),
  idNumber:    z.string().min(3).max(50)
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    kycStatus:      user.kycStatus,
    kycSubmittedAt: user.kycSubmittedAt
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.kycStatus === "approved") {
      return NextResponse.json({ error: "KYC already approved" }, { status: 409 });
    }

    const body = await req.json();
    schema.parse(body); // validate fields (stored externally in production)

    const isDemo = process.env.TRADING_MODE !== "live";

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus:      isDemo ? "approved" : "pending",
        kycSubmittedAt: new Date(),
      }
    });

    return NextResponse.json({
      kycStatus: isDemo ? "approved" : "pending",
      message:   isDemo
        ? "KYC approved! You can now start trading."
        : "KYC submitted. We will review and notify you within 1-2 business days.",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
