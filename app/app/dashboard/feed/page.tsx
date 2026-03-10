"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useProfiles } from "@/contexts/profile-context";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/ui/toast";
import { formatRelativeDate } from "@/lib/utils";
import type { NewsArticle } from "@/types";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  RefreshCw,
  ExternalLink,
  Sparkles,
  Clock,
  Search,
  Newspaper,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
  Save,
  Linkedin,
  Loader2,
  ImagePlus,
  X,
} from "lucide-react";

export default function FeedPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfiles();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AI generation state
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editablePost, setEditablePost] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [showPostConfirm, setShowPostConfirm] = useState(false);

  // Deep-link support: ?articleId=xxx
  const searchParams = useSearchParams();
  const deepLinkArticleId = searchParams.get("articleId");
  const deepLinkApplied = useRef(false);

  const fetchArticles = useCallback(async () => {
    if (!activeProfile || !user) {
      setArticles([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/feeds/${activeProfile.id}`, {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
        if (data.length > 0 && !selectedArticle) {
          // Deep-link: select specific article if articleId param is present
          if (deepLinkArticleId && !deepLinkApplied.current) {
            const target = data.find((a: NewsArticle) => a.id === deepLinkArticleId);
            if (target) {
              setSelectedArticle(target);
              deepLinkApplied.current = true;
              // Deep-link gilt als bewusstes Öffnen → als gelesen markieren
              if (!target.isRead) {
                setArticles(prev =>
                  prev.map(a => a.id === target.id ? { ...a, isRead: true } : a)
                );
                fetch(`/api/feeds/${activeProfile.id}/read`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json", "x-user-id": user.uid },
                  body: JSON.stringify({ articleId: target.id }),
                }).catch(console.error);
              }
            } else {
              setSelectedArticle(data[0]);
            }
          } else {
            setSelectedArticle(data[0]);
          }
        }
      }
    } catch (error) {
      console.error("Fehler beim Laden der News:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProfile, user, selectedArticle]);

  useEffect(() => {
    setLoading(true);
    setSelectedArticle(null);
    setGeneratedPost(null);
    fetchArticles();
  }, [activeProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    if (!activeProfile || !user) return;
    setIsRefreshing(true);

    try {
      const res = await fetch("/api/feeds/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ profileId: activeProfile.id }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.articlesAdded > 0) {
          toast.success(`${data.articlesAdded} neue Artikel geladen`);
        } else {
          toast.info("Keine neuen Artikel gefunden");
        }
        if (data.errors?.length > 0) {
          toast.warning(
            `${data.errors.length} Feed(s) konnten nicht geladen werden`
          );
        }
        await fetchArticles();
      } else {
        toast.error(data.error || "Fehler beim Aktualisieren");
      }
    } catch {
      toast.error("Fehler beim Aktualisieren der Feeds");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedArticle || !activeProfile || !user) return;

    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedPost(null);

    try {
      const response = await fetch("/api/generate/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          articleTitle: selectedArticle.title,
          articleContent: selectedArticle.content,
          masterPrompt: activeProfile.postPrompt.customPrompt,
          profileName: activeProfile.name,
          tonality: activeProfile.postPrompt.tonality,
          targetAudience: activeProfile.postPrompt.targetAudience,
          language: activeProfile.postPrompt.language,
          hashtags: activeProfile.postPrompt.hashtags,
          additionalInstructions: additionalInstructions.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generierung fehlgeschlagen");
      }

      setGeneratedPost(data.post);
      setEditablePost(data.post);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Unbekannter Fehler"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [selectedArticle, activeProfile, user, additionalInstructions]);

  const handleCopy = useCallback(async () => {
    if (!editablePost) return;
    await navigator.clipboard.writeText(editablePost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editablePost]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Nur JPG, PNG, GIF und WebP Bilder erlaubt");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5 MB groß sein");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadedImageUrl(null);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setUploadedImageUrl(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    if (uploadedImageUrl) return uploadedImageUrl;

    setIsUploading(true);
    try {
      const storage = getFirebaseStorage();
      const timestamp = Date.now();
      const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `posts/${user.uid}/${timestamp}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, imageFile);
      const downloadUrl = await getDownloadURL(storageRef);

      setUploadedImageUrl(downloadUrl);
      return downloadUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Fehler beim Hochladen des Bildes");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePost = async () => {
    if (!editablePost || !selectedArticle || !activeProfile || !user) return;

    try {
      let imageUrl: string | null = uploadedImageUrl;
      if (imageFile && !uploadedImageUrl) {
        imageUrl = await uploadImage();
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          profileId: activeProfile.id,
          newsArticleId: selectedArticle.id,
          newsTitle: selectedArticle.title,
          content: editablePost,
          status: "draft",
          ...(imageUrl ? { imageUrl } : {}),
        }),
      });

      if (res.ok) {
        toast.success("Beitrag gespeichert");
      } else {
        toast.error("Fehler beim Speichern");
      }
    } catch {
      toast.error("Fehler beim Speichern");
    }
  };

  const handlePostToLinkedIn = async () => {
    if (!editablePost || !user) return;
    setIsPosting(true);

    try {
      let imageUrl: string | null = uploadedImageUrl;
      if (imageFile && !uploadedImageUrl) {
        imageUrl = await uploadImage();
        if (imageFile && !imageUrl) {
          setIsPosting(false);
          return;
        }
      }

      const res = await fetch("/api/ayrshare/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          content: editablePost,
          platforms: ["linkedin"],
          ...(imageUrl ? { mediaUrls: [imageUrl] } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Posten");
      }

      toast.success("Erfolgreich auf LinkedIn gepostet!");

      if (selectedArticle && activeProfile) {
        await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.uid,
          },
          body: JSON.stringify({
            profileId: activeProfile.id,
            newsArticleId: selectedArticle.id,
            newsTitle: selectedArticle.title,
            content: editablePost,
            status: "final",
            publishedAt: new Date().toISOString(),
            linkedinPostUrl: data.postUrl || "",
            ...(imageUrl ? { imageUrl } : {}),
          }),
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim LinkedIn-Posting"
      );
    } finally {
      setIsPosting(false);
    }
  };

  const handleArticleSelect = (article: NewsArticle) => {
    setSelectedArticle(article);
    setGeneratedPost(null);
    setEditablePost("");
    setGenerateError(null);
    setAdditionalInstructions("");
    handleRemoveImage();

    // Artikel automatisch als gelesen markieren
    if (!article.isRead && activeProfile && user) {
      setArticles(prev =>
        prev.map(a => a.id === article.id ? { ...a, isRead: true } : a)
      );
      fetch(`/api/feeds/${activeProfile.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user.uid },
        body: JSON.stringify({ articleId: article.id }),
      }).catch(console.error);
    }
  };

  const filteredArticles = articles.filter((article) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(q) ||
      article.content.toLowerCase().includes(q) ||
      article.source.toLowerCase().includes(q)
    );
  });

  // Get unique sources for filter chips
  const sources = [
    "Alle",
    ...Array.from(new Set(articles.map((a) => a.source))),
  ];
  const [activeSource, setActiveSource] = useState("Alle");

  const displayArticles =
    activeSource === "Alle"
      ? filteredArticles
      : filteredArticles.filter((a) => a.source === activeSource);

  if (!activeProfile) {
    return (
      <>
        <Header
          title="News Feed"
          description="Aktuelle Nachrichten aus Ihren RSS-Feeds"
        />
        <div className="p-6">
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Newspaper className="h-10 w-10 text-text-muted/20 mb-3" />
              <p className="text-sm font-medium text-text-muted">
                Kein Profil ausgewählt
              </p>
              <p className="text-xs text-text-muted/60 mt-1">
                Erstellen oder wählen Sie ein Profil, um News-Feeds anzuzeigen.
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
        title="News Feed"
        description="RSS-Feeds deiner Google Alerts"
      />

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Article List Panel */}
        <div className="w-[420px] shrink-0 border-r border-surface-border flex flex-col">
          <div className="border-b border-surface-border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <Input
                  placeholder="News durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                loading={isRefreshing}
                className="h-8"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Aktualisieren
              </Button>
            </div>

            {sources.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {sources.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveSource(src)}
                    className={`shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                      activeSource === src
                        ? "bg-primary text-white"
                        : "bg-surface text-text-muted hover:bg-surface-border hover:text-text-main"
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="border-b border-surface-border p-4 space-y-2"
                  >
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : displayArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Newspaper className="h-10 w-10 text-text-muted/30 mb-3" />
                <p className="text-sm font-medium text-text-muted">
                  {articles.length === 0
                    ? "Noch keine News"
                    : "Keine News gefunden"}
                </p>
                <p className="text-xs text-text-muted/70 mt-1">
                  {articles.length === 0
                    ? 'Klicke "Aktualisieren" um Feeds zu laden.'
                    : "Passe die Filter an oder aktualisiere die Feeds."}
                </p>
              </div>
            ) : (
              displayArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => handleArticleSelect(article)}
                  className={`w-full text-left border-b border-surface-border p-4 transition-colors duration-150 cursor-pointer ${
                    selectedArticle?.id === article.id
                      ? "bg-primary-muted/50 border-l-2 border-l-primary"
                      : "hover:bg-surface"
                  } ${article.isRead ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!article.isRead && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {article.source}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-text-main leading-snug line-clamp-2">
                        {article.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDate(article.date)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted/30 shrink-0 mt-1" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Article Detail + Generation Panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedArticle ? (
            <div className="p-6 max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge>{selectedArticle.source}</Badge>
                <span className="text-xs text-text-muted">
                  {new Date(selectedArticle.date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <h2 className="text-xl font-bold text-text-main leading-tight mb-4">
                {selectedArticle.title}
              </h2>

              <p className="text-sm text-text-main leading-relaxed mb-6">
                {selectedArticle.content}
              </p>

              <div className="pb-6 border-b border-surface-border space-y-3">
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Zusätzliche Anweisungen oder eigener Textentwurf (optional)&#10;&#10;z.B. &quot;Fokus auf Nachhaltigkeit&quot; oder einen eigenen Entwurf den die KI als Basis nutzen soll..."
                  title="Zusätzliche Anweisungen für die Beitragsgenerierung"
                  className="w-full min-h-[80px] rounded-[var(--radius-md)] border border-surface-border bg-surface/50 p-3 text-sm text-text-main leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-text-muted/50"
                />
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    loading={isGenerating}
                    disabled={isGenerating}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isGenerating ? "Wird generiert..." : "Beitrag generieren"}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={selectedArticle.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Originalartikel
                    </a>
                  </Button>
                  {generatedPost && (
                    <span className="text-xs text-text-muted ml-auto">
                      Generiert für: {activeProfile.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Generated Post Area */}
              <div className="mt-6">
                {isGenerating ? (
                  <Card>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-medium text-primary">
                          Claude generiert deinen Beitrag...
                        </span>
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[90%]" />
                      <Skeleton className="h-4 w-[95%]" />
                      <Skeleton className="h-4 w-[70%]" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[85%]" />
                    </CardContent>
                  </Card>
                ) : generateError ? (
                  <Card className="border-error/30 bg-error/5">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-error mb-1">
                        Fehler bei der Generierung
                      </p>
                      <p className="text-xs text-error/80">{generateError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        className="mt-3"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Erneut versuchen
                      </Button>
                    </CardContent>
                  </Card>
                ) : generatedPost ? (
                  <Card className="border-primary/20">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-text-main">
                            Generierter LinkedIn-Beitrag
                          </span>
                        </div>
                        <Badge variant="default">Claude</Badge>
                      </div>

                      <textarea
                        value={editablePost}
                        onChange={(e) => setEditablePost(e.target.value)}
                        title="Generierten Beitrag bearbeiten"
                        placeholder="Generierter Beitrag..."
                        className="w-full min-h-[240px] rounded-[var(--radius-md)] border border-surface-border bg-surface/50 p-4 text-sm text-text-main leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />

                      {/* Image Upload */}
                      <div className="mt-3">
                        {imagePreview ? (
                          <div className="relative inline-block">
                            <img
                              src={imagePreview}
                              alt="Vorschau"
                              className="max-h-48 rounded-[var(--radius-md)] border border-surface-border"
                            />
                            <button
                              type="button"
                              title="Bild entfernen"
                              onClick={handleRemoveImage}
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            {isUploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-[var(--radius-md)]">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-text-muted hover:text-text-main transition-colors">
                            <ImagePlus className="h-4 w-4" />
                            <span>Bild hinzufügen (optional)</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-border">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopy}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copied ? "Kopiert!" : "Kopieren"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSavePost}
                        >
                          <Save className="h-3.5 w-3.5" />
                          Speichern
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setShowPostConfirm(true)}
                          disabled={isPosting}
                          className="bg-[#0A66C2] hover:bg-[#004182] text-white"
                        >
                          {isPosting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Linkedin className="h-3.5 w-3.5" />
                          )}
                          Auf LinkedIn posten
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerate}
                          disabled={isGenerating}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Neu generieren
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-2 border-surface-border bg-surface/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Sparkles className="h-8 w-8 text-text-muted/20 mb-3" />
                      <p className="text-sm font-medium text-text-muted">
                        Klicke &quot;Beitrag generieren&quot; um einen
                        LinkedIn-Post zu erstellen
                      </p>
                      <p className="text-xs text-text-muted/60 mt-1">
                        Der Post wird mit dem Master-Prompt von{" "}
                        <span className="font-medium">
                          {activeProfile.name}
                        </span>{" "}
                        generiert.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Newspaper className="h-12 w-12 text-text-muted/20 mb-3" />
              <p className="text-sm font-medium text-text-muted">
                Wähle einen Artikel aus der Liste
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showPostConfirm}
        onOpenChange={setShowPostConfirm}
        title="Posten?"
        description="Möchten Sie diesen Beitrag jetzt auf LinkedIn veröffentlichen?"
        confirmLabel="Ja"
        cancelLabel="Nein"
        loading={isPosting}
        onConfirm={() => {
          setShowPostConfirm(false);
          handlePostToLinkedIn();
        }}
      />
    </>
  );
}
