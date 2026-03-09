import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(
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
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Profil nicht gefunden" },
        { status: 404 }
      );
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 403 }
      );
    }

    return NextResponse.json({ id: doc.id, ...data });
  } catch (error) {
    console.error("Fehler beim Laden des Profils:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

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
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Prevent overwriting userId
    delete updateData.userId;
    delete updateData.id;

    await adminDb.collection("profiles").doc(id).update(updateData);

    return NextResponse.json({ id, ...doc.data(), ...updateData });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Profils:", error);
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
    const doc = await adminDb.collection("profiles").doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Profil nicht gefunden" },
        { status: 404 }
      );
    }

    await adminDb.collection("profiles").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Löschen des Profils:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
