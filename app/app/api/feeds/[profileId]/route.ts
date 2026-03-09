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

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();
    const source = searchParams.get("source");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const snapshot = await adminDb
      .collection("news")
      .where("profileId", "==", profileId)
      .limit(200)
      .get();

    let articles = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.date as string) ?? "").localeCompare((a.date as string) ?? "")
      )
      .slice(0, 100);

    if (source) {
      articles = articles.filter(
        (a) => (a as Record<string, string>).source === source
      );
    }

    // Client-side filtering for search and date range
    if (search) {
      articles = articles.filter(
        (a) =>
          (a as Record<string, string>).title?.toLowerCase().includes(search) ||
          (a as Record<string, string>).content
            ?.toLowerCase()
            .includes(search) ||
          (a as Record<string, string>).source?.toLowerCase().includes(search)
      );
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime();
      articles = articles.filter(
        (a) =>
          new Date((a as Record<string, string>).date).getTime() >= fromDate
      );
    }

    if (dateTo) {
      const toDate = new Date(dateTo).getTime();
      articles = articles.filter(
        (a) =>
          new Date((a as Record<string, string>).date).getTime() <= toDate
      );
    }

    return NextResponse.json(articles);
  } catch (error) {
    console.error("Fehler beim Laden der News:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
