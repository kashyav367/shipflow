import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export async function logAuditEvent({
  userId,
  action,
  details,
  targetType,
  targetId,
}: {
  userId: string;
  action: string;
  details?: string;
  targetType?: string;
  targetId?: string;
}) {
  try {
    const headerList = await headers();
    const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0] ?? null;
    const userAgent = headerList.get("user-agent") ?? null;

    await prisma.auditEvent.create({
      data: {
        userId,
        action,
        details,
        targetType,
        targetId,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.warn("Failed to log audit event:", error);
  }
}
