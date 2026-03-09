"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useProfiles } from "@/contexts/profile-context";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/ui/toast";
import { formatRelativeDate } from "@/lib/utils";
import type { GeneratedPost } from "@/types";
import {
  FileText,
  Copy,
  Check,
  Trash2,
  Pencil,
  Save,
  X,
  Linkedin,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function PostsPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfiles();
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GeneratedPost | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);

  // Deep-link support: ?postId=xxx
  const searchParams = useSearchParams();
  const deepLinkPostId = searchParams.get("postId");
  const deepLinkApplied = useRef(false);

  const handlePostToLinkedIn = async (post: GeneratedPost) => {
    if (!user) return;
    setPostingId(post.id);

    try {
      const res = await fetch("/api/ayrshare/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          content: post.content,
          platforms: ["linkedin"],
          ...(post.imageUrl ? { mediaUrls: [post.imageUrl] } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Posten");
      }

      await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          status: "final",
          publishedAt: new Date().toISOString(),
          linkedinPostUrl: data.postUrl || "",
        }),
      });

      toast.success("Erfolgreich auf LinkedIn gepostet!");
      await fetchPosts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim LinkedIn-Posting"
      );
    } finally {
      setPostingId(null);
    }
  };

  const fetchPosts = useCallback(async () => {
    if (!user) return;

    try {
      const params = new URLSearchParams();
      if (activeProfile) {
        params.set("profileId", activeProfile.id);
      }

      const res = await fetch(`/api/posts?${params}`, {
        headers: { "x-user-id": user.uid },
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Beiträge:", error);
    } finally {
      setLoading(false);
    }
  }, [user, activeProfile]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  // Deep-link: auto-open post for editing
  useEffect(() => {
    if (deepLinkPostId && posts.length > 0 && !deepLinkApplied.current) {
      const target = posts.find((p) => p.id === deepLinkPostId);
      if (target) {
        startEdit(target);
        deepLinkApplied.current = true;
        // Scroll to the post after a short delay
        setTimeout(() => {
          document.getElementById(`post-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [deepLinkPostId, posts]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async (post: GeneratedPost) => {
    await navigator.clipboard.writeText(post.content);
    setCopiedId(post.id);
    toast.success("Beitrag kopiert");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (post: GeneratedPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const handleSave = async () => {
    if (!editingId || !user) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/posts/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (res.ok) {
        toast.success("Beitrag gespeichert");
        setEditingId(null);
        await fetchPosts();
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
      const res = await fetch(`/api/posts/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.uid },
      });

      if (res.ok) {
        toast.success("Beitrag gelöscht");
        setDeleteTarget(null);
        await fetchPosts();
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header
        title="Beiträge"
        description="Ihre generierten LinkedIn-Beiträge"
      />
      <div className="p-6 max-w-3xl">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Noch keine Beiträge"
            description="Generieren Sie LinkedIn-Beiträge aus Ihren News-Artikeln im Feed-Bereich."
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {posts.length} {posts.length === 1 ? "Beitrag" : "Beiträge"}
            </p>
            {posts.map((post) => (
              <Card key={post.id} id={`post-${post.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          post.status === "final" ? "success" : "outline"
                        }
                      >
                        {post.status === "final" ? "Final" : "Entwurf"}
                      </Badge>
                      {post.publishedAt && (
                        <Badge className="gap-1 bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20">
                          <Linkedin className="h-3 w-3" />
                          Gepostet
                        </Badge>
                      )}
                      {post.newsTitle && (
                        <span className="text-xs text-text-muted truncate max-w-[200px]">
                          {post.newsTitle}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted">
                      {formatRelativeDate(post.createdAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === post.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        title="Beitrag bearbeiten"
                        placeholder="Beitragsinhalt..."
                        className="w-full min-h-[200px] rounded-[var(--radius-md)] border border-surface-border bg-surface/50 p-3 text-sm text-text-main leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                      <div className="flex items-center gap-2 mt-3">
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
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-text-main whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>
                      {post.imageUrl && (
                        <div className="mt-3">
                          <img
                            src={post.imageUrl}
                            alt="Beitragsbild"
                            className="max-h-48 rounded-[var(--radius-md)] border border-surface-border"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-border">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopy(post)}
                        >
                          {copiedId === post.id ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedId === post.id ? "Kopiert!" : "Kopieren"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(post)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(post)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-error" />
                        </Button>
                        {!post.linkedinPostUrl ? (
                          <Button
                            size="sm"
                            onClick={() => handlePostToLinkedIn(post)}
                            disabled={!!postingId}
                            className="ml-auto bg-[#0A66C2] hover:bg-[#004182] text-white"
                          >
                            {postingId === post.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Linkedin className="h-3.5 w-3.5" />
                            )}
                            Auf LinkedIn posten
                          </Button>
                        ) : (
                          <a
                            href={post.linkedinPostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium text-[#0A66C2] bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Auf LinkedIn ansehen
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Beitrag löschen"
        description="Möchten Sie diesen Beitrag wirklich unwiderruflich löschen?"
        confirmLabel="Löschen"
        variant="destructive"
        loading={saving}
        onConfirm={handleDelete}
      />
    </>
  );
}
