import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseFeeds } from "@/lib/rss";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { profileId } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId ist erforderlich" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify profile ownership and get feeds
    const profileDoc = await adminDb
      .collection("profiles")
      .doc(profileId)
      .get();
    if (!profileDoc.exists || profileDoc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Profil nicht gefunden" },
        { status: 404 }
      );
    }

    const profile = profileDoc.data();
    const feedUrls: string[] = profile?.feeds || [];

    // Fetch all existing articles for this profile to handle cleanup and dedup
    const existingSnapshot = await adminDb
      .collection("news")
      .where("profileId", "==", profileId)
      .select("link", "feedUrl")
      .get();

    // Delete articles that belong to feed URLs no longer in the profile
    if (existingSnapshot.docs.length > 0) {
      const feedUrlSet = new Set(feedUrls);
      const toDelete = existingSnapshot.docs.filter((doc) => {
        const docFeedUrl = doc.data().feedUrl as string | undefined;
        // Only delete if the article has a known feedUrl that's been removed
        return docFeedUrl && !feedUrlSet.has(docFeedUrl);
      });

      if (toDelete.length > 0) {
        const deleteBatch = adminDb.batch();
        toDelete.forEach((doc) => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
      }
    }

    if (feedUrls.length === 0) {
      return NextResponse.json({
        articlesAdded: 0,
        errors: [],
        message: "Keine RSS-Feeds konfiguriert",
      });
    }

    // Parse all feeds
    const { articles, errors } = await parseFeeds(feedUrls);

    // Build set of existing links (after cleanup) to avoid duplicates
    const existingLinks = new Set(
      existingSnapshot.docs
        .filter((doc) => {
          const docFeedUrl = doc.data().feedUrl as string | undefined;
          return !docFeedUrl || feedUrls.includes(docFeedUrl);
        })
        .map((doc) => doc.data().link as string)
    );

    // Filter out existing articles
    const newArticles = articles.filter((a) => !existingLinks.has(a.link));

    // Batch write new articles
    const batch = adminDb.batch();
    const now = new Date().toISOString();

    for (const article of newArticles) {
      const docRef = adminDb.collection("news").doc();
      batch.set(docRef, {
        ...article,
        profileId,
        isRead: false,
        createdAt: now,
      });
    }

    await batch.commit();

    return NextResponse.json({
      articlesAdded: newArticles.length,
      totalParsed: articles.length,
      errors,
    });
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Feeds:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
