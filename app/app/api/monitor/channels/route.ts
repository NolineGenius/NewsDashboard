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
    const { profileId, name, linkedinUrl } = body;

    if (!profileId || !name) {
      return NextResponse.json(
        { error: "Profil-ID und Name sind erforderlich" },
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
    const channelData = {
      profileId,
      name,
      linkedinUrl: linkedinUrl || "",
      lastChecked: now,
      createdAt: now,
    };

    const docRef = await adminDb
      .collection("monitored_channels")
      .add(channelData);

    return NextResponse.json(
      { id: docRef.id, ...channelData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler beim Hinzufügen des Kanals:", error);
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
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "Kanal-ID ist erforderlich" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    await adminDb.collection("monitored_channels").doc(channelId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Entfernen des Kanals:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
