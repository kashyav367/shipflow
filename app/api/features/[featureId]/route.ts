import { prisma } from "@/lib/db";
import { requireAuth } from "@/features/auth/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { featureId } = await params;

    const feature = await prisma.featureRequest.findUnique({
      where: { id: featureId },
      include: {
        workspace: true,
        tasks: {
          orderBy: { createdAt: "desc" },
        },
        prd: true,
      },
    });

    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Check access
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: feature.workspaceId,
        userId: session.user.id,
      },
    });

    if (!member && feature.workspace.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      id: feature.id,
      title: feature.title,
      status: feature.status,
      tasks: feature.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt,
      })),
      prdContent: feature.prd?.content || null,
    });
  } catch (error) {
    console.error("Feature API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature" },
      { status: 500 }
    );
  }
}
