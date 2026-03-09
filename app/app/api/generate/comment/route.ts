import { NextRequest, NextResponse } from "next/server";
import { generateLinkedInComment } from "@/lib/claude";

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
      originalPost,
      originalAuthor,
      commentPrompt,
      profileName,
      tonality,
      language,
    } = body;

    if (!originalPost) {
      return NextResponse.json(
        { error: "Originalbeitrag ist erforderlich" },
        { status: 400 }
      );
    }

    const comment = await generateLinkedInComment({
      originalPost,
      originalAuthor: originalAuthor || "Unbekannt",
      commentPrompt: commentPrompt || "",
      profileName: profileName || "",
      tonality: tonality || "supportiv",
      language: language || "Deutsch",
    });

    return NextResponse.json({
      comment,
      model: "claude-sonnet-4-20250514",
    });
  } catch (error) {
    console.error("Fehler bei der Kommentargenerierung:", error);
    const message =
      error instanceof Error ? error.message : "Interner Serverfehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
