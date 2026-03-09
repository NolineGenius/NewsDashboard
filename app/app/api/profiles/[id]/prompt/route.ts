import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const adminDb = getAdminDb();
    const doc = await adminDb.collection("profiles").doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Profil nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { type, ...promptData } = body;

    if (type !== "post" && type !== "comment") {
      return NextResponse.json(
        { error: "Typ muss 'post' oder 'comment' sein" },
        { status: 400 }
      );
    }

    const field = type === "post" ? "postPrompt" : "commentPrompt";
    await adminDb
      .collection("profiles")
      .doc(id)
      .update({
        [field]: promptData,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Prompts:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
