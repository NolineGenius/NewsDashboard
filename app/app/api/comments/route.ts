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
    const snapshot = await adminDb
      .collection("comments")
      .where("userId", "==", userId)
      .limit(50)
      .get();

    const comments = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? "")
      );

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Fehler beim Laden der Kommentare:", error);
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
      channelPostId,
      originalPostContent,
      originalAuthor,
      content,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Inhalt ist erforderlich" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const commentData = {
      profileId: profileId || "",
      channelPostId: channelPostId || "",
      originalPostContent: originalPostContent || "",
      originalAuthor: originalAuthor || "",
      content,
      model: "claude-sonnet-4-20250514",
      userId,
      createdAt: now,
    };

    const adminDb = getAdminDb();
    const docRef = await adminDb.collection("comments").add(commentData);

    return NextResponse.json(
      { id: docRef.id, ...commentData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler beim Speichern des Kommentars:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
