"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Toaster } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--sidebar-width)]">{children}</main>
        <Toaster />
      </div>
    </AuthGuard>
  );
}
