import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyCard status="error" message="No verification token found in the link." />;
  }

  try {
    const record = await prisma.emailVerificationToken.findUnique({ where: { token } });

    if (!record) {
      return <VerifyCard status="error" message="This verification link is invalid." />;
    }
    if (record.usedAt) {
      return <VerifyCard status="error" message="This link has already been used. Please sign in." />;
    }
    if (record.expiresAt < new Date()) {
      return <VerifyCard status="error" message="This verification link has expired. Please sign up again." />;
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({ where: { token }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    ]);
  } catch {
    return <VerifyCard status="error" message="Something went wrong. Please try again." />;
  }

  redirect("/login?verified=1");
}

function VerifyCard({ status, message }: { status: "error"; message: string }) {
  return (
    <div className="w-full max-w-md text-center">
      <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-8">
        <div className="text-red-400 text-4xl mb-4">✕</div>
        <h2 className="text-lg font-bold text-white mb-2">Verification Failed</h2>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <Link href="/login" className="text-blue-400 hover:underline text-sm">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
