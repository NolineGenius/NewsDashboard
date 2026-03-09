"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useProfiles } from "@/contexts/profile-context";
import { toast } from "@/components/ui/toast";
import { User, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { profiles } = useProfiles();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Erfolgreich abgemeldet");
    } catch {
      toast.error("Fehler beim Abmelden");
    }
  };

  return (
    <>
      <Header
        title="Einstellungen"
        description="Kontoeinstellungen und Sicherheit"
      />
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <CardTitle>Konto</CardTitle>
            </div>
            <CardDescription>
              Kontoinformationen und Sitzungsverwaltung
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-[var(--radius-md)] bg-surface p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-muted">E-Mail:</span>
                  <span className="text-text-main">
                    {user?.email || "–"}
                  </span>
                  <span className="text-text-muted">Profile:</span>
                  <span className="text-text-main">
                    {profiles.length}{" "}
                    {profiles.length === 1 ? "Profil" : "Profile"}
                  </span>
                  <span className="text-text-muted">Mitglied seit:</span>
                  <span className="text-text-main">
                    {user?.metadata?.creationTime
                      ? new Date(user.metadata.creationTime).toLocaleDateString(
                          "de-DE"
                        )
                      : "–"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Abmelden
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle>Datenschutz & Sicherheit</CardTitle>
            </div>
            <CardDescription>
              Informationen zum Schutz Ihrer Daten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[var(--radius-md)] bg-surface p-3 text-sm text-text-muted space-y-2">
              <p>
                Ihre Daten werden sicher gespeichert und sind durch
                Sicherheitsregeln geschützt, sodass nur Sie auf Ihre
                eigenen Daten zugreifen können.
              </p>
              <p>
                Die gesamte Kommunikation erfolgt verschlüsselt über HTTPS.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title="Konto löschen"
        description="Möchten Sie Ihr Konto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Profile, gespeicherten Beiträge und Kommentare werden unwiderruflich gelöscht."
        confirmLabel="Konto löschen"
        variant="destructive"
        onConfirm={() => {
          toast.error("Kontolöschung ist noch nicht implementiert.");
          setDeleteAccountOpen(false);
        }}
      />
    </>
  );
}
