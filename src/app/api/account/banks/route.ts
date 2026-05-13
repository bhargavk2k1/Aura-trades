import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ABA routing number checksum validation
function isValidRouting(r: string): boolean {
  if (!/^\d{9}$/.test(r)) return false;
  const d = r.split("").map(Number);
  const sum = 3*(d[0]+d[3]+d[6]) + 7*(d[1]+d[4]+d[7]) + (d[2]+d[5]+d[8]);
  return sum % 10 === 0;
}

const addSchema = z.object({
  bankName:    z.string().min(2).max(80),
  accountType: z.enum(["checking", "savings"]),
  accountNumber: z.string().regex(/^\d{4,17}$/, "Account number must be 4–17 digits"),
  routingNumber: z.string().regex(/^\d{9}$/, "Routing number must be 9 digits"),
  nickname:    z.string().max(40).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banks = await prisma.bankAccount.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, bankName: true, accountType: true, last4: true,
      routingNumber: true, nickname: true, status: true,
      microDeposit1: true, microDeposit2: true, verifyAttempts: true, createdAt: true,
    },
  });

  // Mask routing number (show last 4)
  return NextResponse.json(banks.map(b => ({
    ...b,
    routingNumber: `•••••${b.routingNumber.slice(-4)}`,
    // Don't expose micro-deposit amounts — only tell client whether they exist
    hasMicroDeposits: b.microDeposit1 !== null,
    microDeposit1: undefined,
    microDeposit2: undefined,
  })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { bankName, accountType, accountNumber, routingNumber, nickname } = parsed.data;

  // Validate ABA routing number checksum
  if (!isValidRouting(routingNumber)) {
    return NextResponse.json({ error: "Invalid routing number — please check and try again." }, { status: 400 });
  }

  // Limit to 5 bank accounts per user
  const count = await prisma.bankAccount.count({ where: { userId: session.sub } });
  if (count >= 5) {
    return NextResponse.json({ error: "Maximum of 5 bank accounts allowed." }, { status: 400 });
  }

  // Generate two small micro-deposit amounts (simulated — in production these would be real ACH credits)
  const md1 = parseFloat((Math.random() * 0.98 + 0.01).toFixed(2));
  const md2 = parseFloat((Math.random() * 0.98 + 0.01).toFixed(2));

  const bank = await prisma.bankAccount.create({
    data: {
      userId:       session.sub,
      bankName,
      accountType,
      last4:        accountNumber.slice(-4),
      routingNumber,
      nickname:     nickname ?? "",
      status:       "pending_verification",
      microDeposit1: md1,
      microDeposit2: md2,
    },
  });

  return NextResponse.json({
    id:       bank.id,
    bankName: bank.bankName,
    last4:    bank.last4,
    status:   bank.status,
    message:  `Two small deposits (under $1 each) have been sent to your ${bankName} account ending in ${bank.last4}. They arrive within 1–2 business days. Enter the exact amounts to verify.`,
  }, { status: 201 });
}
