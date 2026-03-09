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

    const lambdaUrl = process.env.AYRSHARE_POST_COMMENT_URL;
    if (!lambdaUrl) {
      return NextResponse.json(
        { error: "Kommentar-Funktion ist nicht konfiguriert" },
        { status: 503 }
      );
    }

    const body = await request.json();

    const lambdaPayload = {
      userId,
      postId: body.postId,
      comment: body.comment,
      searchPlatformId: body.searchPlatformId ?? true,
    };

    console.log("[monitor/comment] Sending postId:", body.postId);
    console.log("[monitor/comment] Comment length:", body.comment?.length);
    console.log("[monitor/comment] searchPlatformId:", body.searchPlatformId);

    const lambdaRes = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lambdaPayload),
    });

    const text = await lambdaRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[monitor/comment] Lambda returned non-JSON:", text);
      return NextResponse.json(
        { error: `Lambda-Fehler: ${text.substring(0, 200)}` },
        { status: 502 }
      );
    }

    if (!lambdaRes.ok) {
      console.error("[monitor/comment] Lambda error:", data);
      const errorMsg = data.details
        ? `${data.error}: ${data.details}`
        : data.error || "Fehler beim Posten des Kommentars";
      return NextResponse.json(
        { error: errorMsg },
        { status: lambdaRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fehler beim Kommentar-Posting:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
