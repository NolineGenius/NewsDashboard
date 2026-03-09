import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

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
    const { profileId, channelId, channelName, content, authorName, linkedinUrl } = body;

    if (!profileId || !channelId || !content) {
      return NextResponse.json(
        { error: "Profil-ID, Kanal-ID und Inhalt sind erforderlich" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify profile ownership
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

    const now = new Date().toISOString();

    // Extract LinkedIn post ID from URL if provided
    let linkedinPostId: string | undefined;
    if (linkedinUrl) {
      const match = linkedinUrl.match(/urn:li:(?:activity|ugcPost|share):(\d+)/);
      if (match) {
        linkedinPostId = match[0];
      } else {
        const activityMatch = linkedinUrl.match(/activity[:\-/](\d+)/);
        if (activityMatch) {
          linkedinPostId = `urn:li:activity:${activityMatch[1]}`;
        }
      }
    }

    const postData = {
      profileId,
      channelId,
      channelName: channelName || "",
      content,
      authorName: authorName || channelName || "Unbekannt",
      linkedinUrl: linkedinUrl || "",
      linkedinPostId: linkedinPostId || "",
      date: now,
      createdAt: now,
    };

    const docRef = await adminDb.collection("channel_posts").add(postData);

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

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { error: "Post-ID ist erforderlich" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    await adminDb.collection("channel_posts").doc(postId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Löschen des Beitrags:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
