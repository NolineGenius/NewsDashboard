import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const lambdaUrl = process.env.AYRSHARE_GENERATE_JWT_URL;
    if (!lambdaUrl) {
      return NextResponse.json(
        { error: "Ayrshare ist nicht konfiguriert" },
        { status: 503 }
      );
    }

    const url = `${lambdaUrl}?userId=${encodeURIComponent(userId)}`;
    const lambdaRes = await fetch(url);
    const text = await lambdaRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Lambda returned non-JSON:", text);
      return NextResponse.json(
        { error: `Lambda-Fehler: ${text.substring(0, 200)}` },
        { status: 502 }
      );
    }

    if (!lambdaRes.ok) {
      return NextResponse.json(
        { error: data.error || "Fehler beim Generieren des JWT" },
        { status: lambdaRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fehler bei JWT-Generierung:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
