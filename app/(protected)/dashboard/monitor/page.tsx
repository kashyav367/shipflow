import { requireAuth } from "@/features/auth/actions";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Monitor · Dashboard",
};

export default async function MonitorPage() {
  const session = await requireAuth();

  if (session.user.email !== process.env.OWNER_EMAIL) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        You do not have access to this monitoring page.
      </div>
    );
  }

  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
  });

  return (
    <>
      <DashboardHeader
        title="Monitor"
        description="Track all user activity — logins, feature requests, PRD approvals, and more."
      />
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">All User Activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            This view shows sign-ins, feature creation, PRD approvals, and all important actions taken by every user.
          </p>
        </div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {event.user?.image ? (
                      <img
                        src={event.user.image}
                        alt=""
                        className="size-8 rounded-full border border-border shrink-0"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {event.user?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {event.user?.name ?? "Unknown"} · {event.user?.email ?? ""}
                      </p>
                      {event.details ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.details}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{new Date(event.createdAt).toLocaleString()}</p>
                    {event.ipAddress ? <p>{event.ipAddress}</p> : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
