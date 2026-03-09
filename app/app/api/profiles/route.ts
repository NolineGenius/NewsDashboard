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
      .collection("profiles")
      .where("userId", "==", userId)
      .get();

    const profiles = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? "")
      );

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Fehler beim Laden der Profile:", error);
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
    const { name, color, feeds } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const profileData = {
      name,
      color: color || "#2D5BFF",
      feeds: feeds || [],
      postPrompt: {
        profileName: name,
        tonality: "",
        targetAudience: "",
        language: "Deutsch",
        hashtags: "",
        customPrompt: "",
      },
      commentPrompt: {
        tonality: "",
        style: "",
        language: "Deutsch",
        customPrompt: "",
      },
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const adminDb = getAdminDb();
    const docRef = await adminDb.collection("profiles").add(profileData);

    return NextResponse.json(
      { id: docRef.id, ...profileData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler beim Erstellen des Profils:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
