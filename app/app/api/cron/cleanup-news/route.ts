import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_AGE_DAYS = 7;
const BATCH_SIZE = 500;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
    const cutoffIso = cutoff.toISOString();

    const snapshot = await adminDb
      .collection("news")
      .where("createdAt", "<", cutoffIso)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ deleted: 0, message: "Keine alten Artikel gefunden." });
    }

    // Löschen in Batches (Firestore-Limit: 500 pro Batch)
    let deleted = 0;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += Math.min(BATCH_SIZE, docs.length - i);
    }

    console.log(`Cleanup: ${deleted} News-Artikel älter als ${MAX_AGE_DAYS} Tage gelöscht.`);
    return NextResponse.json({ deleted, cutoff: cutoffIso });
  } catch (error) {
    console.error("Fehler beim News-Cleanup:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
