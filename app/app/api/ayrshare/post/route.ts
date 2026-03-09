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

    const lambdaUrl = process.env.AYRSHARE_POST_URL;
    if (!lambdaUrl) {
      return NextResponse.json(
        { error: "Ayrshare ist nicht konfiguriert" },
        { status: 503 }
      );
    }

    const body = await request.json();

    const lambdaPayload = {
      userId,
      content: body.content,
      platforms: body.platforms || ["linkedin"],
      ...(body.mediaUrls?.length ? { mediaUrls: body.mediaUrls } : {}),
    };

    console.log("[ayrshare/post] Calling Lambda:", lambdaUrl);
    console.log("[ayrshare/post] Payload:", JSON.stringify(lambdaPayload));

    const lambdaRes = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lambdaPayload),
    });

    const text = await lambdaRes.text();

    console.log("[ayrshare/post] Lambda status:", lambdaRes.status);
    console.log("[ayrshare/post] Lambda response:", text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[ayrshare/post] Lambda returned non-JSON:", text);
      return NextResponse.json(
        { error: `Lambda-Fehler: ${text.substring(0, 200)}` },
        { status: 502 }
      );
    }

    if (!lambdaRes.ok) {
      console.error("[ayrshare/post] Lambda error:", data);
      const errorMsg = data.details
        ? `${data.error}: ${data.details}`
        : data.error || "Fehler beim Posten auf LinkedIn";
      return NextResponse.json(
        { error: errorMsg },
        { status: lambdaRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fehler beim LinkedIn-Posting:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
