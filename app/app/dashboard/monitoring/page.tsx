"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatRelativeDate, extractLinkedInPostId } from "@/lib/utils";
import type { MonitoredChannel, ChannelPost } from "@/types";
import {
  Eye,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  ChevronRight,
  Loader2,
  Newspaper,
  Layers,
  Download,
  Linkedin,
} from "lucide-react";

// Filter IDs
const ALL_POSTS_ID = "__all__";

// Unified post type for the combined view
interface UnifiedPost {
  id: string;
  source: string; // channelId
  sourceName: string;
  content: string;
  authorName: string;
  date: string;
  likes?: number;
  comments?: number;
  shares?: number;
  postUrl?: string;
  linkedinPostId?: string;
  originalChannelPost?: ChannelPost;
}

export default function MonitoringPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfiles();

  // Channel management
  const [channels, setChannels] = useState<MonitoredChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MonitoredChannel | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Data
  const [channelPosts, setChannelPosts] = useState<ChannelPost[]>([]);
  const [channelPostsLoading, setChannelPostsLoading] = useState(false);

  // Filter & selection
  const [activeFilter, setActiveFilter] = useState<string>(ALL_POSTS_ID);
  const [selectedPost, setSelectedPost] = useState<UnifiedPost | null>(null);

  // Scraping
  const [scrapingChannelId, setScrapingChannelId] = useState<string | null>(null);

  // Add post modal for channels
  const [addPostOpen, setAddPostOpen] = useState(false);
  const [addPostChannelId, setAddPostChannelId] = useState("");
  const [addPostChannelName, setAddPostChannelName] = useState("");
  const [addPostContent, setAddPostContent] = useState("");
  const [addPostAuthor, setAddPostAuthor] = useState("");
  const [addPostUrl, setAddPostUrl] = useState("");
  const [savingPost, setSavingPost] = useState(false);

  // Comment generation
  const [generatedComment, setGeneratedComment] = useState<string | null>(null);
  const [editableComment, setEditableComment] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────────

  const fetchChannels = useCallback(async () => {
    if (!activeProfile || !user) {
      setChannels([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/monitor/${activeProfile.id}`, {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Kanäle:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProfile, user]);

  const fetchChannelPosts = useCallback(async () => {
    if (!activeProfile || !user) {
      setChannelPosts([]);
      return;
    }
    setChannelPostsLoading(true);

    try {
      const res = await fetch(`/api/monitor/posts/${activeProfile.id}`, {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setChannelPosts(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Kanal-Beiträge:", error);
    } finally {
      setChannelPostsLoading(false);
    }
  }, [activeProfile, user]);

  // Load all data on mount
  useEffect(() => {
    setLoading(true);
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    fetchChannelPosts();
  }, [fetchChannelPosts]);

  // ─── Unified Posts ────────────────────────────────────────────

  const unifiedPosts = useMemo<UnifiedPost[]>(() => {
    const posts: UnifiedPost[] = channelPosts.map((cp) => ({
      id: `channel-${cp.id}`,
      source: cp.channelId,
      sourceName: cp.channelName,
      content: cp.content,
      authorName: cp.authorName,
      date: cp.date,
      likes: cp.likes,
      comments: cp.comments,
      shares: cp.shares,
      postUrl: cp.linkedinUrl,
      linkedinPostId: cp.linkedinPostId,
      originalChannelPost: cp,
    }));

    // Sort by date, newest first
    posts.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return posts;
  }, [channelPosts]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === ALL_POSTS_ID) return unifiedPosts;
    return unifiedPosts.filter((p) => p.source === activeFilter);
  }, [unifiedPosts, activeFilter]);

  // ─── Channel Management ───────────────────────────────────────

  const handleAddChannel = async () => {
    if (!newName.trim() || !activeProfile || !user) return;
    setSaving(true);

    try {
      const res = await fetch("/api/monitor/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          profileId: activeProfile.id,
          name: newName.trim(),
          linkedinUrl: newUrl.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Kanal hinzugefügt");
        setAddOpen(false);
        setNewName("");
        setNewUrl("");
        await fetchChannels();
      } else {
        toast.error("Fehler beim Hinzufügen");
      }
    } catch {
      toast.error("Fehler beim Hinzufügen");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!deleteTarget || !user) return;
    setSaving(true);

    try {
      const res = await fetch("/api/monitor/channels", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ channelId: deleteTarget.id }),
      });

      if (res.ok) {
        toast.success("Kanal entfernt");
        setDeleteTarget(null);
        if (activeFilter === deleteTarget.id) {
          setActiveFilter(ALL_POSTS_ID);
        }
        // Remove channel posts from local state
        setChannelPosts((prev) =>
          prev.filter((p) => p.channelId !== deleteTarget.id)
        );
        await fetchChannels();
      } else {
        toast.error("Fehler beim Entfernen");
      }
    } catch {
      toast.error("Fehler beim Entfernen");
    } finally {
      setSaving(false);
    }
  };

  // ─── Channel Post Management ──────────────────────────────────

  const openAddPostModal = (channelId: string, channelName: string) => {
    setAddPostChannelId(channelId);
    setAddPostChannelName(channelName);
    setAddPostAuthor(channelName);
    setAddPostContent("");
    setAddPostUrl("");
    setAddPostOpen(true);
  };

  const handleSavePost = async () => {
    if (!addPostContent.trim() || !activeProfile || !user) return;
    setSavingPost(true);

    try {
      const res = await fetch("/api/monitor/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          profileId: activeProfile.id,
          channelId: addPostChannelId,
          channelName: addPostChannelName,
          content: addPostContent.trim(),
          authorName: addPostAuthor.trim() || addPostChannelName,
          linkedinUrl: addPostUrl.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Beitrag gespeichert");
        setAddPostOpen(false);
        await fetchChannelPosts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Fehler beim Speichern");
      }
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    // Remove the "channel-" prefix to get the Firestore doc ID
    const firestoreId = postId.startsWith("channel-")
      ? postId.slice("channel-".length)
      : postId;

    try {
      const res = await fetch("/api/monitor/posts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ postId: firestoreId }),
      });

      if (res.ok) {
        toast.success("Beitrag entfernt");
        setChannelPosts((prev) => prev.filter((p) => p.id !== firestoreId));
        setSelectedPost(null);
      } else {
        toast.error("Fehler beim Entfernen");
      }
    } catch {
      toast.error("Fehler beim Entfernen");
    }
  };

  // ─── Scrape Channel Posts (Apify) ───────────────────────────────

  const handleScrapeChannel = async (channel: MonitoredChannel) => {
    if (!activeProfile || !user || !channel.linkedinUrl) return;
    setScrapingChannelId(channel.id);

    try {
      const res = await fetch("/api/monitor/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          profileId: activeProfile.id,
          channelId: channel.id,
          channelName: channel.name,
          linkedinProfileUrl: channel.linkedinUrl,
          maxPosts: 10,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.newPosts > 0) {
          toast.success(
            `${data.newPosts} neue Beiträge von ${channel.name} geladen`
          );
          await fetchChannelPosts();
        } else {
          toast.success(`Keine neuen Beiträge von ${channel.name}`);
        }
      } else {
        toast.error(data.error || "Fehler beim Abrufen der Beiträge");
      }
    } catch {
      toast.error("Fehler beim Abrufen der LinkedIn-Beiträge");
    } finally {
      setScrapingChannelId(null);
    }
  };

  // ─── Filter Selection ─────────────────────────────────────────

  const handleSelectFilter = (id: string) => {
    setActiveFilter(id);
    setSelectedPost(null);
    setGeneratedComment(null);
    setEditableComment("");
  };

  // ─── Comment Generation ───────────────────────────────────────

  const handleGenerateComment = async (
    postContent: string,
    authorName: string
  ) => {
    if (!postContent.trim() || !activeProfile || !user) return;
    setIsGenerating(true);
    setGeneratedComment(null);

    try {
      const res = await fetch("/api/generate/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          originalPost: postContent,
          originalAuthor: authorName || "Unbekannt",
          commentPrompt: activeProfile.commentPrompt.customPrompt,
          profileName: activeProfile.name,
          tonality: activeProfile.commentPrompt.tonality,
          language: activeProfile.commentPrompt.language,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedComment(data.comment);
        setEditableComment(data.comment);
      } else {
        toast.error(data.error || "Fehler bei der Generierung");
      }
    } catch {
      toast.error("Fehler bei der Kommentar-Generierung");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyComment = async () => {
    if (!editableComment) return;
    await navigator.clipboard.writeText(editableComment);
    setCopied(true);
    toast.success("Kommentar kopiert");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePostComment = async () => {
    if (!editableComment || !selectedPost || !user) return;

    const postId =
      selectedPost.linkedinPostId ||
      (selectedPost.postUrl
        ? extractLinkedInPostId(selectedPost.postUrl)
        : null);

    if (!postId) {
      toast.error("Keine LinkedIn Post-ID gefunden");
      return;
    }

    setIsPostingComment(true);
    try {
      const res = await fetch("/api/monitor/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          postId,
          comment: editableComment,
          searchPlatformId: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Kommentar auf LinkedIn gepostet");
        setGeneratedComment(null);
        setEditableComment("");
      } else {
        toast.error(data.error || "Fehler beim Posten des Kommentars");
      }
    } catch {
      toast.error("Fehler beim Posten des Kommentars");
    } finally {
      setIsPostingComment(false);
    }
  };

  // ─── Refresh All ──────────────────────────────────────────────

  const handleRefreshAll = async () => {
    await fetchChannelPosts();
  };

  const isLoading = channelPostsLoading;

  // ─── Count helpers ────────────────────────────────────────────

  const channelPostCount = (channelId: string) =>
    channelPosts.filter((p) => p.channelId === channelId).length;

  // ─── Render ───────────────────────────────────────────────────

  if (!activeProfile) {
    return (
      <>
        <Header
          title="Monitoring"
          description="Beobachten Sie LinkedIn-Kanäle und reagieren Sie auf Beiträge"
        />
        <div className="p-6">
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Eye className="h-10 w-10 text-text-muted/20 mb-3" />
              <p className="text-sm font-medium text-text-muted">
                Kein Profil ausgewählt
              </p>
              <p className="text-xs text-text-muted/60 mt-1">
                Wählen Sie ein Profil, um Kanäle zu überwachen.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Monitoring"
        description="Beobachten Sie LinkedIn-Kanäle und reagieren Sie auf Beiträge"
      />

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* ─── Left Panel: Filter / Channels ─────────────────── */}
        <div className="w-[420px] shrink-0 border-r border-surface-border flex flex-col">
          <div className="border-b border-surface-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-main">
                Kanäle
              </span>
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="h-7"
              >
                <Plus className="h-3.5 w-3.5" />
                Hinzufügen
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Alle Beiträge */}
            <button
              type="button"
              onClick={() => handleSelectFilter(ALL_POSTS_ID)}
              className={`w-full text-left border-b border-surface-border p-4 transition-colors duration-150 cursor-pointer ${
                activeFilter === ALL_POSTS_ID
                  ? "bg-primary-muted/50 border-l-2 border-l-primary"
                  : "hover:bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-main">
                      Alle Beiträge
                    </p>
                    <p className="text-xs text-text-muted">
                      {unifiedPosts.length}{" "}
                      {unifiedPosts.length === 1 ? "Beitrag" : "Beiträge"}{" "}
                      insgesamt
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted/30" />
              </div>
            </button>

            {/* Channel list */}
            {loading ? (
              <div className="space-y-0">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="border-b border-surface-border p-4 space-y-2"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
            ) : (
              channels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => handleSelectFilter(channel.id)}
                  className={`w-full text-left border-b border-surface-border p-4 transition-colors duration-150 cursor-pointer ${
                    activeFilter === channel.id
                      ? "bg-primary-muted/50 border-l-2 border-l-primary"
                      : "hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted">
                        <Eye className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-main">
                          {channel.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {channelPostCount(channel.id)}{" "}
                          {channelPostCount(channel.id) === 1
                            ? "Beitrag"
                            : "Beiträge"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {channel.linkedinUrl && (
                        <button
                          type="button"
                          title="Beiträge von LinkedIn abrufen"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScrapeChannel(channel);
                          }}
                          disabled={scrapingChannelId === channel.id}
                          className="p-1 rounded hover:bg-surface-border transition-colors disabled:opacity-50"
                        >
                          {scrapingChannelId === channel.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-primary" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        title="Beitrag manuell hinzufügen"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddPostModal(channel.id, channel.name);
                        }}
                        className="p-1 rounded hover:bg-surface-border transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 text-text-muted" />
                      </button>
                      <button
                        type="button"
                        title="Kanal entfernen"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(channel);
                        }}
                        className="p-1 rounded hover:bg-surface-border transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-error" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-text-muted/30" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Right Panel: Posts ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {selectedPost ? (
            // ─── Post Detail View ───────────────────────────────
            <PostDetailView
              post={selectedPost}
              onBack={() => {
                setSelectedPost(null);
                setGeneratedComment(null);
                setEditableComment("");
              }}
              onDelete={() => handleDeletePost(selectedPost.id)}
              generatedComment={generatedComment}
              editableComment={editableComment}
              isGenerating={isGenerating}
              copied={copied}
              onSetEditableComment={setEditableComment}
              onGenerateComment={() =>
                handleGenerateComment(
                  selectedPost.content,
                  selectedPost.authorName
                )
              }
              onRegenerateComment={() => {
                setGeneratedComment(null);
                setEditableComment("");
                handleGenerateComment(
                  selectedPost.content,
                  selectedPost.authorName
                );
              }}
              onCopyComment={handleCopyComment}
              onPostComment={handlePostComment}
              isPostingComment={isPostingComment}
            />
          ) : (
            // ─── Post List View ─────────────────────────────────
            <div className="p-6 max-w-3xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-text-main">
                    {activeFilter === ALL_POSTS_ID
                      ? "Alle Beiträge"
                      : channels.find((c) => c.id === activeFilter)?.name ||
                        "Beiträge"}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {filteredPosts.length}{" "}
                    {filteredPosts.length === 1 ? "Beitrag" : "Beiträge"}
                    {activeFilter === ALL_POSTS_ID &&
                      channels.length > 0 &&
                      ` aus ${channels.length} Quellen`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeFilter !== ALL_POSTS_ID &&
                    (() => {
                      const ch = channels.find(
                        (c) => c.id === activeFilter
                      );
                      return (
                        <>
                          {ch?.linkedinUrl && (
                            <Button
                              size="sm"
                              onClick={() => handleScrapeChannel(ch)}
                              loading={scrapingChannelId === ch.id}
                              disabled={!!scrapingChannelId}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Beiträge abrufen
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openAddPostModal(ch!.id, ch!.name)
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Manuell hinzufügen
                          </Button>
                        </>
                      );
                    })()}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAll}
                    loading={isLoading}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Aktualisieren
                  </Button>
                </div>
              </div>

              {isLoading && filteredPosts.length === 0 ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-5 space-y-3">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[60%]" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Newspaper className="h-10 w-10 text-text-muted/20 mb-3" />
                    <p className="text-sm font-medium text-text-muted">
                      Keine Beiträge vorhanden
                    </p>
                    <p className="text-xs text-text-muted/60 mt-1 max-w-sm">
                      {activeFilter !== ALL_POSTS_ID
                        ? "Fügen Sie Beiträge über den \"+\" Button hinzu."
                        : "Fügen Sie Kanäle hinzu und rufen Sie deren Beiträge ab."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setSelectedPost(post)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Source badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                              >
                                <Eye className="h-2.5 w-2.5" />
                                {post.sourceName}
                              </Badge>
                              {post.date && (
                                <span className="text-[10px] text-text-muted">
                                  {formatRelativeDate(post.date)}
                                </span>
                              )}
                            </div>

                            {/* Author */}
                            <p className="text-xs font-medium text-text-muted mb-1">
                              {post.authorName}
                            </p>

                            {/* Content preview */}
                            <p className="text-sm text-text-main line-clamp-3 leading-relaxed">
                              {post.content}
                            </p>

                            {/* Metrics */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                              {post.likes !== undefined && post.likes > 0 && (
                                <span>{post.likes} Likes</span>
                              )}
                              {post.comments !== undefined &&
                                post.comments > 0 && (
                                  <span>{post.comments} Kommentare</span>
                                )}
                              {post.shares !== undefined && post.shares > 0 && (
                                <span>{post.shares} Shares</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-text-muted/30 shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Add Channel Modal ───────────────────────────────── */}
      <Modal open={addOpen} onOpenChange={setAddOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Kanal hinzufügen</ModalTitle>
            <ModalDescription>
              Fügen Sie einen LinkedIn-Kanal hinzu, den Sie beobachten möchten.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                Kanalname
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Dr. Anna Weber"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                LinkedIn-URL (optional)
              </label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleAddChannel}
              loading={saving}
              disabled={!newName.trim()}
            >
              Hinzufügen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ─── Add Post Modal ──────────────────────────────────── */}
      <Modal open={addPostOpen} onOpenChange={setAddPostOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Beitrag hinzufügen</ModalTitle>
            <ModalDescription>
              Fügen Sie einen LinkedIn-Beitrag von &quot;{addPostChannelName}&quot;
              hinzu.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                Autor
              </label>
              <Input
                value={addPostAuthor}
                onChange={(e) => setAddPostAuthor(e.target.value)}
                placeholder={addPostChannelName}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                LinkedIn-Beitrags-URL (optional)
              </label>
              <Input
                value={addPostUrl}
                onChange={(e) => setAddPostUrl(e.target.value)}
                placeholder="https://linkedin.com/feed/update/urn:li:activity:..."
              />
              {addPostUrl && (
                <p className="mt-1 text-xs text-text-muted">
                  {extractLinkedInPostId(addPostUrl) ? (
                    <span className="text-green-600">
                      Post-ID erkannt:{" "}
                      {extractLinkedInPostId(addPostUrl)}
                    </span>
                  ) : (
                    <span className="text-amber-600">
                      Keine gültige LinkedIn-Post-ID erkannt
                    </span>
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                Beitragsinhalt
              </label>
              <textarea
                value={addPostContent}
                onChange={(e) => setAddPostContent(e.target.value)}
                placeholder="LinkedIn-Beitrag hier einfügen..."
                title="LinkedIn-Beitrag einfügen"
                className="w-full min-h-[120px] rounded-[var(--radius-md)] border border-surface-border bg-surface/50 p-3 text-sm text-text-main leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setAddPostOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSavePost}
              loading={savingPost}
              disabled={!addPostContent.trim()}
            >
              Speichern
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ─── Delete Channel Confirm ──────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Kanal entfernen"
        description={`Möchten Sie den Kanal "${deleteTarget?.name}" wirklich entfernen? Alle gespeicherten Beiträge dieses Kanals bleiben erhalten.`}
        confirmLabel="Entfernen"
        variant="destructive"
        loading={saving}
        onConfirm={handleDeleteChannel}
      />
    </>
  );
}

// ─── Post Detail Component ────────────────────────────────────────

function PostDetailView({
  post,
  onBack,
  onDelete,
  generatedComment,
  editableComment,
  isGenerating,
  copied,
  onSetEditableComment,
  onGenerateComment,
  onRegenerateComment,
  onCopyComment,
  onPostComment,
  isPostingComment,
}: {
  post: UnifiedPost;
  onBack: () => void;
  onDelete: () => void;
  generatedComment: string | null;
  editableComment: string;
  isGenerating: boolean;
  copied: boolean;
  onSetEditableComment: (v: string) => void;
  onGenerateComment: () => void;
  onRegenerateComment: () => void;
  onCopyComment: () => void;
  onPostComment: () => void;
  isPostingComment: boolean;
}) {
  return (
    <div className="p-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        &larr; Zurück zur Übersicht
      </Button>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline">
              <Eye className="h-3 w-3" />
              {post.sourceName}
            </Badge>
            {post.date && (
              <span className="text-xs text-text-muted">
                {formatRelativeDate(post.date)}
              </span>
            )}
          </div>

          <p className="text-xs font-medium text-text-muted mb-2">
            Von: {post.authorName}
          </p>

          <p className="text-sm text-text-main whitespace-pre-wrap leading-relaxed mb-4">
            {post.content}
          </p>

          {(post.likes !== undefined ||
            post.comments !== undefined ||
            post.shares !== undefined) && (
            <div className="flex items-center gap-4 text-xs text-text-muted mb-4 pb-4 border-b border-surface-border">
              {post.likes !== undefined && (
                <span>{post.likes} Likes</span>
              )}
              {post.comments !== undefined && (
                <span>{post.comments} Kommentare</span>
              )}
              {post.shares !== undefined && (
                <span>{post.shares} Shares</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {post.postUrl && (
              <a
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Auf LinkedIn ansehen
              </a>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 text-xs text-error hover:underline"
            >
              <Trash2 className="h-3 w-3" />
              Beitrag entfernen
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Comment generation */}
      <div className="mt-4">
        {!generatedComment && !isGenerating && (
          <Button size="sm" onClick={onGenerateComment}>
            <Sparkles className="h-3.5 w-3.5" />
            Kommentar generieren
          </Button>
        )}

        {isGenerating && !generatedComment && (
          <Card className="mt-2">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">
                  Claude generiert einen Kommentar...
                </span>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[60%]" />
            </CardContent>
          </Card>
        )}

        {generatedComment && (
          <Card className="mt-2 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-text-main">
                  Generierter Kommentar
                </span>
              </div>
              <textarea
                value={editableComment}
                onChange={(e) => onSetEditableComment(e.target.value)}
                title="Kommentar bearbeiten"
                className="w-full min-h-[100px] rounded-[var(--radius-md)] border border-surface-border bg-surface/50 p-3 text-sm text-text-main leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <div className="flex items-center gap-2 mt-3">
                <Button variant="secondary" size="sm" onClick={onCopyComment}>
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Kopiert!" : "Kopieren"}
                </Button>
                {(post.linkedinPostId ||
                  (post.postUrl &&
                    extractLinkedInPostId(post.postUrl))) && (
                  <Button
                    size="sm"
                    onClick={onPostComment}
                    loading={isPostingComment}
                    disabled={isPostingComment || !editableComment}
                    className="bg-[#0A66C2] hover:bg-[#094d92] text-white"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    Auf LinkedIn posten
                  </Button>
                )}
                {post.postUrl && (
                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Auf LinkedIn ansehen
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerateComment}
                  disabled={isGenerating}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Neu
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
