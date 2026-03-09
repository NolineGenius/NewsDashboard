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

    const snapshot = await adminDb
      .collection("monitored_channels")
      .where("profileId", "==", profileId)
      .get();

    const channels = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? "")
      );

    return NextResponse.json(channels);
  } catch (error) {
    console.error("Fehler beim Laden der Kanäle:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
