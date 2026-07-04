"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChatTeardropText, 
  FileText, 
  Kanban, 
  GitBranch, 
  RocketLaunch 
} from "@phosphor-icons/react";

interface FeatureNavigationTabsProps {
  id: string;
  status: string;
}

export function FeatureNavigationTabs({ id, status }: FeatureNavigationTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      label: "AI Clarification",
      href: `/dashboard/features/${id}/clarify`,
      icon: ChatTeardropText,
      segment: "clarify",
    },
    {
      label: "AI PRD",
      href: `/dashboard/features/${id}/prd`,
      icon: FileText,
      segment: "prd",
    },
    {
      label: "Kanban Board",
      href: `/dashboard/features/${id}/tasks`,
      icon: Kanban,
      segment: "tasks",
    },
    {
      label: "GitHub Develop",
      href: `/dashboard/features/${id}/develop`,
      icon: GitBranch,
      segment: "develop",
    },
    {
      label: "Release Approval",
      href: `/dashboard/features/${id}/release`,
      icon: RocketLaunch,
      segment: "release",
    },
  ];

  return (
    <div className="border-b border-border bg-card">
      <div className="flex space-x-1 p-2 max-w-4xl mx-auto overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.endsWith(tab.segment) || pathname.includes(`/${tab.segment}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm animate-fade-in"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
