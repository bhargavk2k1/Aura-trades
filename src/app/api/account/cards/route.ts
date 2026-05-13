import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Luhn algorithm — standard credit card number validation
function luhn(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectCardType(num: string): string {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n))                         return "visa";
  if (/^5[1-5]|^2[2-7]/.test(n))           return "mastercard";
  if (/^3[47]/.test(n))                     return "amex";
  if (/^6(?:011|5|4[4-9]|22)/.test(n))     return "discover";
  return "unknown";
}

const addSchema = z.object({
  cardNumber:     z.string().regex(/^\d{13,19}$/, "Invalid card number"),
  cardholderName: z.string().min(2).max(60),
  expiryMonth:    z.number().int().min(1).max(12),
  expiryYear:     z.number().int().min(2024).max(2040),
  cvv:            z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
  nickname:       z.string().max(40).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await prisma.savedCard.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "asc" },
    select: { id: true, cardholderName: true, last4: true, cardType: true, expiryMonth: true, expiryYear: true, nickname: true, createdAt: true },
  });
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });

  const { cardNumber, cardholderName, expiryMonth, expiryYear, cvv, nickname } = parsed.data;

  if (!luhn(cardNumber)) return NextResponse.json({ error: "Card number is invalid. Please check and try again." }, { status: 400 });

  const cardType = detectCardType(cardNumber);
  const expectedCvvLen = cardType === "amex" ? 4 : 3;
  if (cvv.length !== expectedCvvLen) {
    return NextResponse.json({ error: `CVV must be ${expectedCvvLen} digits for ${cardType === "amex" ? "Amex" : "this card type"}.` }, { status: 400 });
  }

  const now = new Date();
  if (expiryYear < now.getFullYear() || (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1)) {
    return NextResponse.json({ error: "This card has expired." }, { status: 400 });
  }

  const count = await prisma.savedCard.count({ where: { userId: session.sub } });
  if (count >= 5) return NextResponse.json({ error: "Maximum of 5 cards allowed." }, { status: 400 });

  const card = await prisma.savedCard.create({
    data: {
      userId: session.sub,
      cardholderName,
      last4:       cardNumber.slice(-4),
      cardType,
      expiryMonth,
      expiryYear,
      nickname:    nickname ?? "",
    },
  });

  return NextResponse.json({ id: card.id, last4: card.last4, cardType: card.cardType }, { status: 201 });
}
