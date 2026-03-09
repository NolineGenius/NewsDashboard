"use client";

import { ProfileSwitcher } from "@/components/layout/profile-switcher";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-border bg-surface-card/80 px-6 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold text-text-main">{title}</h1>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ProfileSwitcher />
      </div>
    </header>
  );
}
