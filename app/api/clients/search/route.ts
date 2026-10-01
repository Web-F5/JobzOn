import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const clients = await prisma.client.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { name:  { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true, name: true, email: true, phone: true,
      smsEnabled: true, portalToken: true,
      _count: { select: { services: true, invoices: true } },
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json(clients);
}
