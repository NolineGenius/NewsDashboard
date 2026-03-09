import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = adminDb
      .collection("posts")
      .where("userId", "==", userId)
      .limit(limit);

    if (profileId) {
      query = query.where("profileId", "==", profileId);
    }

    const snapshot = await query.get();
    const posts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? "")
      );

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Fehler beim Laden der Beiträge:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

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
    const {
      profileId,
      newsArticleId,
      newsTitle,
      content,
      status,
      publishedAt,
      linkedinPostUrl,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Inhalt ist erforderlich" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const postData: Record<string, unknown> = {
      profileId: profileId || "",
      newsArticleId: newsArticleId || "",
      newsTitle: newsTitle || "",
      content,
      status: status || "draft",
      model: "claude-sonnet-4-20250514",
      userId,
      createdAt: now,
      updatedAt: now,
    };

    if (body.imageUrl) postData.imageUrl = body.imageUrl;
    if (publishedAt) postData.publishedAt = publishedAt;
    if (linkedinPostUrl) postData.linkedinPostUrl = linkedinPostUrl;

    const adminDb = getAdminDb();
    const docRef = await adminDb.collection("posts").add(postData);

    return NextResponse.json(
      { id: docRef.id, ...postData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler beim Speichern des Beitrags:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
