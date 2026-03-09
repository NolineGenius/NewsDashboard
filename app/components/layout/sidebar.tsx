"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Eye,
  Users,
  Settings,
  Rss,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "News Feed", href: "/dashboard/feed", icon: Newspaper },
  { name: "Beiträge", href: "/dashboard/posts", icon: FileText },
  { name: "Monitoring", href: "/dashboard/monitoring", icon: Eye },
  { name: "Profile", href: "/dashboard/profiles", icon: Users },
  { name: "Einstellungen", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[var(--sidebar-width)] flex-col border-r border-surface-border bg-surface-card">
      <div className="flex h-14 items-center gap-2.5 border-b border-surface-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-primary">
          <Rss className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold text-text-main">
          NewsDash
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-primary-muted text-primary"
                  : "text-text-muted hover:bg-surface hover:text-text-main"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-border p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-text-muted transition-colors duration-200 hover:bg-surface hover:text-error cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
