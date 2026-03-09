"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { useProfiles } from "@/contexts/profile-context";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/ui/toast";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Rss,
  ChevronDown,
  ChevronUp,
  Linkedin,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { Profile, MasterPrompt, CommentMasterPrompt } from "@/types";

const PROFILE_COLORS = [
  "#2D5BFF",
  "#30A46C",
  "#E5484D",
  "#F0A030",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

export default function ProfilesPage() {
  const { user } = useAuth();
  const { profiles, loading, refreshProfiles } = useProfiles();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [connectingProfileId, setConnectingProfileId] = useState<string | null>(
    null
  );

  const handleConnectLinkedIn = async (profile: Profile) => {
    if (!user) return;
    setConnectingProfileId(profile.id);

    try {
      const createRes = await fetch("/api/ayrshare/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ title: profile.name }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(
          err.error || "Fehler beim Erstellen des Ayrshare-Profils"
        );
      }

      const createData = await createRes.json();

      let jwtUrl = createData.jwtUrl;
      if (!jwtUrl) {
        const jwtRes = await fetch("/api/ayrshare/generate-jwt", {
          method: "POST",
          headers: { "x-user-id": user.uid },
        });
        const jwtData = await jwtRes.json();
        jwtUrl = jwtData.linkUrl;
      }

      if (jwtUrl) {
        window.open(jwtUrl, "_blank");
        toast.success(
          "LinkedIn-Verbindung wird in neuem Tab geöffnet. Bitte dort anmelden."
        );
      } else {
        throw new Error("Kein JWT-Link erhalten");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler bei LinkedIn-Verbindung"
      );
    } finally {
      setConnectingProfileId(null);
    }
  };

  // Create form state
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0]);
  const [newFeeds, setNewFeeds] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editFeeds, setEditFeeds] = useState("");
  const [editPostPrompt, setEditPostPrompt] = useState<MasterPrompt>({
    profileName: "",
    tonality: "",
    targetAudience: "",
    language: "Deutsch",
    hashtags: "",
    customPrompt: "",
  });
  const [editCommentPrompt, setEditCommentPrompt] =
    useState<CommentMasterPrompt>({
      tonality: "",
      style: "",
      language: "Deutsch",
      customPrompt: "",
    });

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setSaving(true);

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          name: newName.trim(),
          color: newColor,
          feeds: newFeeds
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        toast.success("Profil erstellt");
        setCreateOpen(false);
        setNewName("");
        setNewColor(PROFILE_COLORS[0]);
        setNewFeeds("");
        await refreshProfiles();
      } else {
        toast.error("Fehler beim Erstellen des Profils");
      }
    } catch {
      toast.error("Fehler beim Erstellen des Profils");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setEditColor(profile.color);
    setEditFeeds(profile.feeds.join("\n"));
    setEditPostPrompt(profile.postPrompt);
    setEditCommentPrompt(profile.commentPrompt);
  };

  const handleSave = async () => {
    if (!editingId || !user) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/profiles/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          feeds: editFeeds
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          postPrompt: editPostPrompt,
          commentPrompt: editCommentPrompt,
        }),
      });

      if (res.ok) {
        toast.success("Profil gespeichert");
        setEditingId(null);
        await refreshProfiles();
      } else {
        toast.error("Fehler beim Speichern");
      }
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/profiles/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.uid },
      });

      if (res.ok) {
        toast.success("Profil gelöscht");
        setDeleteTarget(null);
        await refreshProfiles();
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header
          title="Profile"
          description="Verwalten Sie Ihre LinkedIn-Profile und Master-Prompts"
        />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 rounded-[var(--radius-lg)] bg-surface-border/60"
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Profile"
        description="Verwalten Sie Ihre LinkedIn-Profile und Master-Prompts"
      />
      <div className="p-6 max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {profiles.length}{" "}
            {profiles.length === 1 ? "Profil" : "Profile"}
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Neues Profil
          </Button>
        </div>

        {profiles.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Noch keine Profile"
            description="Erstellen Sie Ihr erstes LinkedIn-Profil mit individuellem Master-Prompt."
            actionLabel="Profil erstellen"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: profile.color }}
                      />
                      {editingId === profile.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-48"
                        />
                      ) : (
                        <CardTitle>{profile.name}</CardTitle>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === profile.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            loading={saving}
                          >
                            <Save className="h-3.5 w-3.5" />
                            Speichern
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(profile)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(profile)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-error" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === profile.id ? (
                    <div className="space-y-6">
                      {/* Color picker */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-text-main">
                          Farbe
                        </label>
                        <div className="flex gap-2">
                          {PROFILE_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              title={`Farbe ${c}`}
                              onClick={() => setEditColor(c)}
                              className={`h-7 w-7 rounded-full border-2 cursor-pointer transition-transform ${
                                editColor === c
                                  ? "border-text-main scale-110"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* RSS Feeds */}
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-main">
                          <Rss className="h-3.5 w-3.5" />
                          RSS-Feed-URLs
                        </label>
                        <Textarea
                          value={editFeeds}
                          onChange={(e) => setEditFeeds(e.target.value)}
                          placeholder="Eine URL pro Zeile..."
                          rows={3}
                        />
                        <p className="mt-1 text-xs text-text-muted">
                          Google Alerts RSS-Feed-URLs, eine pro Zeile
                        </p>
                      </div>

                      {/* Post Master Prompt */}
                      <div>
                        <button
                          onClick={() =>
                            setExpandedPrompt(
                              expandedPrompt === `${profile.id}-post`
                                ? null
                                : `${profile.id}-post`
                            )
                          }
                          className="flex w-full items-center justify-between rounded-[var(--radius-md)] bg-surface px-3 py-2 text-sm font-medium text-text-main cursor-pointer"
                        >
                          <span>Beitrags-Master-Prompt</span>
                          {expandedPrompt === `${profile.id}-post` ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {expandedPrompt === `${profile.id}-post` && (
                          <div className="mt-3 space-y-3 pl-1">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-text-muted">
                                  Tonalität
                                </label>
                                <Input
                                  value={editPostPrompt.tonality}
                                  onChange={(e) =>
                                    setEditPostPrompt({
                                      ...editPostPrompt,
                                      tonality: e.target.value,
                                    })
                                  }
                                  placeholder="z.B. professionell, visionär"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-text-muted">
                                  Zielgruppe
                                </label>
                                <Input
                                  value={editPostPrompt.targetAudience}
                                  onChange={(e) =>
                                    setEditPostPrompt({
                                      ...editPostPrompt,
                                      targetAudience: e.target.value,
                                    })
                                  }
                                  placeholder="z.B. C-Level, Fachpublikum"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-text-muted">
                                  Sprache
                                </label>
                                <Input
                                  value={editPostPrompt.language}
                                  onChange={(e) =>
                                    setEditPostPrompt({
                                      ...editPostPrompt,
                                      language: e.target.value,
                                    })
                                  }
                                  placeholder="Deutsch"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-text-muted">
                                  Hashtags
                                </label>
                                <Input
                                  value={editPostPrompt.hashtags}
                                  onChange={(e) =>
                                    setEditPostPrompt({
                                      ...editPostPrompt,
                                      hashtags: e.target.value,
                                    })
                                  }
                                  placeholder="#Innovation #Tech"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-muted">
                                Custom-Prompt
                              </label>
                              <Textarea
                                value={editPostPrompt.customPrompt}
                                onChange={(e) =>
                                  setEditPostPrompt({
                                    ...editPostPrompt,
                                    customPrompt: e.target.value,
                                  })
                                }
                                placeholder="Spezifische Anweisungen für die Beitragsgenerierung..."
                                rows={4}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Comment Master Prompt */}
                      <div>
                        <button
                          onClick={() =>
                            setExpandedPrompt(
                              expandedPrompt === `${profile.id}-comment`
                                ? null
                                : `${profile.id}-comment`
                            )
                          }
                          className="flex w-full items-center justify-between rounded-[var(--radius-md)] bg-surface px-3 py-2 text-sm font-medium text-text-main cursor-pointer"
                        >
                          <span>Kommentar-Master-Prompt</span>
                          {expandedPrompt === `${profile.id}-comment` ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {expandedPrompt === `${profile.id}-comment` && (
                          <div className="mt-3 space-y-3 pl-1">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-text-muted">
                                  Tonalität
                                </label>
                                <Input
                                  value={editCommentPrompt.tonality}
                                  onChange={(e) =>
                                    setEditCommentPrompt({
                                      ...editCommentPrompt,
                                      tonality: e.target.value,
                                    })
                                  }
                                  placeholder="z.B. supportiv, fachlich"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-text-muted">
                                  Stil
                                </label>
                                <Input
                                  value={editCommentPrompt.style}
                                  onChange={(e) =>
                                    setEditCommentPrompt({
                                      ...editCommentPrompt,
                                      style: e.target.value,
                                    })
                                  }
                                  placeholder="z.B. netzwerkend, professionell"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-text-muted">
                                  Sprache
                                </label>
                                <Input
                                  value={editCommentPrompt.language}
                                  onChange={(e) =>
                                    setEditCommentPrompt({
                                      ...editCommentPrompt,
                                      language: e.target.value,
                                    })
                                  }
                                  placeholder="Deutsch"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-muted">
                                Custom-Prompt
                              </label>
                              <Textarea
                                value={editCommentPrompt.customPrompt}
                                onChange={(e) =>
                                  setEditCommentPrompt({
                                    ...editCommentPrompt,
                                    customPrompt: e.target.value,
                                  })
                                }
                                placeholder="Spezifische Anweisungen für Kommentare..."
                                rows={3}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {profile.feeds.length} RSS-Feed
                          {profile.feeds.length !== 1 ? "s" : ""}
                        </Badge>
                        {profile.postPrompt.tonality && (
                          <Badge>{profile.postPrompt.tonality}</Badge>
                        )}
                        {profile.postPrompt.language && (
                          <Badge variant="outline">
                            {profile.postPrompt.language}
                          </Badge>
                        )}
                        {profile.linkedinConnected && (
                          <Badge className="gap-1 bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20">
                            <CheckCircle className="h-3 w-3" />
                            LinkedIn verbunden
                          </Badge>
                        )}
                      </div>
                      {profile.postPrompt.customPrompt && (
                        <p className="text-xs text-text-muted line-clamp-2">
                          {profile.postPrompt.customPrompt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1 border-t border-surface-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnectLinkedIn(profile)}
                          disabled={!!connectingProfileId}
                        >
                          {connectingProfileId === profile.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Linkedin className="h-3.5 w-3.5" />
                          )}
                          {profile.linkedinConnected
                            ? "Erneut verbinden"
                            : "LinkedIn verbinden"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Profile Modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Neues Profil erstellen</ModalTitle>
            <ModalDescription>
              Erstellen Sie ein LinkedIn-Profil mit RSS-Feeds und
              Master-Prompt.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                Profilname
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Max Mustermann"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                Farbe
              </label>
              <div className="flex gap-2">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={`Farbe ${c}`}
                    onClick={() => setNewColor(c)}
                    className={`h-7 w-7 rounded-full border-2 cursor-pointer transition-transform ${
                      newColor === c
                        ? "border-text-main scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                RSS-Feed-URLs (optional)
              </label>
              <Textarea
                value={newFeeds}
                onChange={(e) => setNewFeeds(e.target.value)}
                placeholder="Eine URL pro Zeile..."
                rows={3}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleCreate}
              loading={saving}
              disabled={!newName.trim()}
            >
              Erstellen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Profil löschen"
        description={`Möchten Sie das Profil "${deleteTarget?.name}" wirklich löschen? Alle zugehörigen Daten werden ebenfalls gelöscht.`}
        confirmLabel="Löschen"
        variant="destructive"
        loading={saving}
        onConfirm={handleDelete}
      />
    </>
  );
}
