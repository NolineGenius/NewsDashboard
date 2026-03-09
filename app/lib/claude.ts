import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY ist nicht konfiguriert.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface GeneratePostParams {
  articleTitle: string;
  articleContent: string;
  masterPrompt: string;
  profileName: string;
  tonality: string;
  targetAudience: string;
  language: string;
  hashtags: string;
  additionalInstructions?: string;
}

export interface GenerateCommentParams {
  originalPost: string;
  originalAuthor: string;
  commentPrompt: string;
  profileName: string;
  tonality: string;
  language: string;
}

export async function generateLinkedInPost(
  params: GeneratePostParams
): Promise<string> {
  const anthropic = getClient();

  const systemPrompt = `Du bist ein LinkedIn-Content-Experte. Du schreibst im Namen von "${params.profileName}".

MASTER-PROMPT DES PROFILS:
${params.masterPrompt}

PROFIL-DETAILS:
- Tonalität: ${params.tonality}
- Zielgruppe: ${params.targetAudience}
- Sprache: ${params.language}
- Bevorzugte Hashtags: ${params.hashtags}

REGELN:
- Schreibe einen LinkedIn-Beitrag basierend auf dem News-Artikel
- Halte dich strikt an die Tonalität und den Stil des Master-Prompts
- Der Beitrag soll informativ, relevant und engagement-fördernd sein
- Schließe mit den bevorzugten Hashtags ab
- Kein Markdown, keine Formatierung außer Zeilenumbrüchen und Aufzählungszeichen
- Antworte NUR mit dem fertigen LinkedIn-Beitrag, keine Erklärungen`;

  const userPrompt = `Schreibe einen LinkedIn-Beitrag basierend auf diesem News-Artikel:

TITEL: ${params.articleTitle}

INHALT: ${params.articleContent}${params.additionalInstructions ? `\n\nZUSÄTZLICHE ANWEISUNGEN DES NUTZERS:\n${params.additionalInstructions}` : ""}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}

export async function generateLinkedInComment(
  params: GenerateCommentParams
): Promise<string> {
  const anthropic = getClient();

  const systemPrompt = `Du bist ein LinkedIn-Engagement-Experte. Du kommentierst im Namen von "${params.profileName}".

KOMMENTAR-MASTER-PROMPT DES PROFILS:
${params.commentPrompt}

PROFIL-DETAILS:
- Tonalität: ${params.tonality}
- Sprache: ${params.language}

REGELN:
- Schreibe einen Kommentar auf den LinkedIn-Beitrag von ${params.originalAuthor}
- Halte dich strikt an den Stil des Kommentar-Master-Prompts
- Der Kommentar soll wertvoll, authentisch und netzwerkfördernd sein
- Maximal 3-4 Sätze
- Kein Markdown
- Antworte NUR mit dem fertigen Kommentar, keine Erklärungen`;

  const userPrompt = `Schreibe einen Kommentar auf diesen LinkedIn-Beitrag von ${params.originalAuthor}:

"${params.originalPost}"`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}
