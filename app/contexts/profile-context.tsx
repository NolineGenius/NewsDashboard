"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import type { Profile } from "@/types";

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfileId: (id: string) => void;
  loading: boolean;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const refreshProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profiles", {
        headers: {
          "x-user-id": user.uid,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // Restore active profile from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("activeProfileId");
    if (stored) {
      setActiveProfileId(stored);
    }
  }, []);

  // Persist active profile to localStorage
  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem("activeProfileId", activeProfileId);
    }
  }, [activeProfileId]);

  // Auto-select first profile if none is active
  useEffect(() => {
    if (!activeProfileId && profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profiles, activeProfileId]);

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? null;

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfileId,
        loading,
        refreshProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error(
      "useProfiles muss innerhalb eines ProfileProvider verwendet werden"
    );
  }
  return context;
}
