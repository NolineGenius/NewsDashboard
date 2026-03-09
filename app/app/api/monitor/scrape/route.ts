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

    const lambdaUrl = process.env.APIFY_SCRAPE_URL;
    if (!lambdaUrl) {
      return NextResponse.json(
        { error: "LinkedIn-Scraping ist nicht konfiguriert" },
        { status: 503 }
      );
    }

    const body = await request.json();

    const lambdaPayload = {
      profileId: body.profileId,
      channelId: body.channelId,
      channelName: body.channelName,
      linkedinProfileUrl: body.linkedinProfileUrl,
      maxPosts: body.maxPosts || 10,
    };

    const lambdaRes = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lambdaPayload),
      signal: AbortSignal.timeout(150000), // 150s timeout (Apify kann dauern)
    });

    const text = await lambdaRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[monitor/scrape] Lambda returned non-JSON:", text);
      return NextResponse.json(
        { error: `Lambda-Fehler: ${text.substring(0, 200)}` },
        { status: 502 }
      );
    }

    if (!lambdaRes.ok) {
      const errorMsg = data.details
        ? `${data.error}: ${data.details}`
        : data.error || "Fehler beim Scrapen";
      return NextResponse.json(
        { error: errorMsg },
        { status: lambdaRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fehler beim LinkedIn-Scraping:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
