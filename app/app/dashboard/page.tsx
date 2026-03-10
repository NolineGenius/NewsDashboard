"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfiles } from "@/contexts/profile-context";
import { useAuth } from "@/contexts/auth-context";
import { formatRelativeDate, truncate } from "@/lib/utils";
import type { NewsArticle, GeneratedPost } from "@/types";
import { Newspaper, FileText, Users, Eye, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { profiles, activeProfile, loading: profilesLoading } = useProfiles();
  const [newsCount, setNewsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [channelsCount, setChannelsCount] = useState(0);
  const [recentNews, setRecentNews] = useState<NewsArticle[]>([]);
  const [recentPosts, setRecentPosts] = useState<GeneratedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeProfile) {
      setNewsCount(0);
      setPostsCount(0);
      setChannelsCount(0);
      setRecentNews([]);
      setRecentPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        const [newsRes, postsRes, channelsRes] = await Promise.all([
          fetch(`/api/feeds/${activeProfile.id}`, {
            headers: { "x-user-id": user.uid },
          }),
          fetch(`/api/posts?limit=5&profileId=${activeProfile.id}`, {
            headers: { "x-user-id": user.uid },
          }),
          fetch(`/api/monitor/${activeProfile.id}`, {
            headers: { "x-user-id": user.uid },
          }),
        ]);

        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNewsCount(
            newsData.filter((a: NewsArticle) => !a.isRead).length
          );
          setRecentNews(newsData.slice(0, 5));
        }

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPostsCount(postsData.length);
          setRecentPosts(postsData.slice(0, 5));
        }

        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          setChannelsCount(Array.isArray(channelsData) ? channelsData.length : 0);
        }
      } catch (error) {
        console.error("Dashboard-Daten konnten nicht geladen werden:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeProfile]);

  const stats = [
    {
      label: "Ungelesene News",
      value: newsCount,
      icon: Newspaper,
      color: "text-primary",
      bg: "bg-primary-muted",
      href: "/dashboard/feed",
    },
    {
      label: "Generierte Beiträge",
      value: postsCount,
      icon: FileText,
      color: "text-success",
      bg: "bg-success/10",
      href: "/dashboard/posts",
    },
    {
      label: "Aktive Profile",
      value: profiles.length,
      icon: Users,
      color: "text-warning",
      bg: "bg-warning/10",
      href: "/dashboard/profiles",
    },
    {
      label: "Beobachtete Kanäle",
      value: channelsCount,
      icon: Eye,
      color: "text-error",
      bg: "bg-error/10",
      href: "/dashboard/monitoring",
    },
  ];

  return (
    <>
      <Header
        title="Dashboard"
        description="Übersicht über Ihre News und LinkedIn-Aktivitäten"
      />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">
                    {stat.label}
                  </CardTitle>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] ${stat.bg}`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading || profilesLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-text-main">
                      {stat.value}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent News */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Aktuelle News</CardTitle>
              <Link
                href="/dashboard/feed"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Alle anzeigen
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : recentNews.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  Noch keine News. Laden Sie Ihre RSS-Feeds im Feed-Bereich.
                </p>
              ) : (
                <div className="space-y-0">
                  {recentNews.map((article) => (
                    <Link
                      key={article.id}
                      href={`/dashboard/feed?articleId=${article.id}`}
                      className="flex items-start gap-2 py-2.5 px-2 -mx-2 rounded-[var(--radius-md)] border-b border-surface-border last:border-0 hover:bg-surface transition-colors cursor-pointer"
                    >
                      {!article.isRead && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-main line-clamp-1">
                          {article.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {article.source}
                          </Badge>
                          <span className="text-xs text-text-muted">
                            {formatRelativeDate(article.date)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Letzte Beiträge</CardTitle>
              <Link
                href="/dashboard/posts"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Alle anzeigen
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : recentPosts.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  Noch keine Beiträge generiert.
                </p>
              ) : (
                <div className="space-y-0">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/dashboard/posts?postId=${post.id}`}
                      className="block py-2.5 px-2 -mx-2 rounded-[var(--radius-md)] border-b border-surface-border last:border-0 hover:bg-surface transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-text-main line-clamp-2">
                        {truncate(post.content, 120)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            post.status === "final" ? "success" : "outline"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {post.status === "final" ? "Final" : "Entwurf"}
                        </Badge>
                        <span className="text-xs text-text-muted">
                          {formatRelativeDate(post.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!activeProfile && !profilesLoading && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Willkommen bei NewsDash</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted">
                  Erstellen Sie zunächst ein Profil unter &quot;Profile&quot; und
                  fügen Sie Ihre Google Alerts RSS-Feeds hinzu, um loszulegen.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
