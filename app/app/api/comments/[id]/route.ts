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
    const doc = await adminDb.collection("comments").doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Kommentar nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    await adminDb.collection("comments").doc(id).update({
      content: body.content,
    });

    return NextResponse.json({ id, ...doc.data(), content: body.content });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Kommentars:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const doc = await adminDb.collection("comments").doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Kommentar nicht gefunden" },
        { status: 404 }
      );
    }

    await adminDb.collection("comments").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Löschen des Kommentars:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
