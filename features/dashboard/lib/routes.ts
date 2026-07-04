export const DASHBOARD_ROUTES = {
  overview: "/dashboard",
  repos: "/dashboard/repos",
  pullRequests: "/dashboard/pull-requests",
  github: "/dashboard/github",
  settings: "/dashboard/settings",
  monitor: "/dashboard/monitor",
  newFeature: "/dashboard/features/new",
} as const;

export type DashboardRoute =
  (typeof DASHBOARD_ROUTES)[keyof typeof DASHBOARD_ROUTES];

export const DASHBOARD_NAV_ITEMS = [
  {
    title: "Overview",
    href: DASHBOARD_ROUTES.overview,
    icon: "layout-dashboard" as const,
  },
  {
    title: "Repositories",
    href: DASHBOARD_ROUTES.repos,
    icon: "folder-git-2" as const,
  },
  {
    title: "PullRequests",
    href: DASHBOARD_ROUTES.pullRequests,
    icon: "folder-git-2" as const,
  },
  {
    title: "Request Feature",
    href: DASHBOARD_ROUTES.newFeature,
    icon: "sparkle" as const,
  },
  {
    title: "GitHub App",
    href: DASHBOARD_ROUTES.github,
    icon: "github" as const,
  },
  {
    title: "Settings",
    href: DASHBOARD_ROUTES.settings,
    icon: "settings" as const,
  },
  {
    title: "Monitor",
    href: DASHBOARD_ROUTES.monitor,
    icon: "eye" as const,
  },
] as const;
