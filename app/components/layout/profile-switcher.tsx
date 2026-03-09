"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfiles } from "@/contexts/profile-context";

export function ProfileSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { profiles, activeProfile, setActiveProfileId, loading } =
    useProfiles();
  const router = useRouter();

  if (loading || profiles.length === 0) {
    return (
      <button
        type="button"
        onClick={() => router.push("/dashboard/profiles")}
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-surface-border bg-surface-card px-3 py-1.5 text-sm font-medium text-text-muted transition-colors duration-200 hover:bg-surface cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Profil erstellen
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-surface-border bg-surface-card px-3 py-1.5 text-sm font-medium text-text-main transition-colors duration-200 hover:bg-surface cursor-pointer"
      >
        {activeProfile && (
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: activeProfile.color }}
          />
        )}
        <span className="max-w-[120px] truncate">
          {activeProfile?.name ?? "Profil wählen"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-muted transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-[var(--radius-lg)] border border-surface-border bg-surface-card py-1 shadow-lg">
            <div className="px-3 py-1.5 text-xs font-medium text-text-muted">
              Profil wechseln
            </div>
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  setActiveProfileId(profile.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150 cursor-pointer",
                  activeProfile?.id === profile.id
                    ? "bg-primary-muted text-primary"
                    : "text-text-main hover:bg-surface"
                )}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: profile.color }}
                />
                <span className="truncate">{profile.name}</span>
              </button>
            ))}
            <div className="mt-1 border-t border-surface-border pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard/profiles");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-muted transition-colors duration-150 hover:bg-surface hover:text-text-main cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Neues Profil
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
