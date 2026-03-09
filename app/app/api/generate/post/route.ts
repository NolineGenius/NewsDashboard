import { NextRequest, NextResponse } from "next/server";
import { generateLinkedInPost } from "@/lib/claude";

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
    const {
      articleTitle,
      articleContent,
      masterPrompt,
      profileName,
      tonality,
      targetAudience,
      language,
      hashtags,
      additionalInstructions,
    } = body;

    if (!articleTitle || !articleContent) {
      return NextResponse.json(
        { error: "Artikeltitel und -inhalt sind erforderlich" },
        { status: 400 }
      );
    }

    const post = await generateLinkedInPost({
      articleTitle,
      articleContent,
      masterPrompt: masterPrompt || "",
      profileName: profileName || "",
      tonality: tonality || "professionell",
      targetAudience: targetAudience || "",
      language: language || "Deutsch",
      hashtags: hashtags || "",
      additionalInstructions: additionalInstructions || "",
    });

    return NextResponse.json({ post, model: "claude-sonnet-4-20250514" });
  } catch (error) {
    console.error("Fehler bei der Beitragsgenerierung:", error);
    const message =
      error instanceof Error ? error.message : "Interner Serverfehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
