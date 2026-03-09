import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
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

    // Optional channelId filter
    const channelId = request.nextUrl.searchParams.get("channelId");

    let query = adminDb
      .collection("channel_posts")
      .where("profileId", "==", profileId);

    if (channelId) {
      query = query.where("channelId", "==", channelId);
    }

    const snapshot = await query.get();

    const posts = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Normalize date to ISO string (handles Apify nested objects, Firestore Timestamps, etc.)
        if (data.date && typeof data.date !== "string") {
          if (data.date.date && typeof data.date.date === "string") {
            // Apify format: { timestamp, date: "ISO string", postedAgoShort, postedAgoText }
            data.date = data.date.date;
          } else if (data.date.timestamp && typeof data.date.timestamp === "number") {
            data.date = new Date(data.date.timestamp).toISOString();
          } else if (data.date.toDate?.()) {
            // Firestore Timestamp
            data.date = data.date.toDate().toISOString();
          } else {
            data.date = null;
          }
        }
        if (data.createdAt && typeof data.createdAt !== "string") {
          data.createdAt = data.createdAt.toDate?.()
            ? data.createdAt.toDate().toISOString()
            : String(data.createdAt);
        }
        return { id: doc.id, ...data };
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = a.date ? new Date(a.date as string).getTime() : 0;
        const dateB = b.date ? new Date(b.date as string).getTime() : 0;
        return dateB - dateA;
      });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Fehler beim Laden der Kanal-Beiträge:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
