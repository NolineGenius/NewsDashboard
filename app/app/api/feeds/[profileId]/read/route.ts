import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function PATCH(
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

    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json(
        { error: "articleId fehlt" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Profilbesitz prüfen
    const profileDoc = await adminDb.collection("profiles").doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Profil nicht gefunden" },
        { status: 404 }
      );
    }

    // Artikel prüfen
    const articleDoc = await adminDb.collection("news").doc(articleId).get();
    if (!articleDoc.exists || articleDoc.data()?.profileId !== profileId) {
      return NextResponse.json(
        { error: "Artikel nicht gefunden" },
        { status: 404 }
      );
    }

    await adminDb.collection("news").doc(articleId).update({
      isRead: true,
      readAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Markieren als gelesen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
