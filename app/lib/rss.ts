import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});

interface ParsedArticle {
  title: string;
  link: string;
  source: string;
  date: string;
  content: string;
  feedUrl: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSource(link: string, feedTitle?: string): string {
  if (feedTitle && !feedTitle.toLowerCase().includes("google alert")) {
    return feedTitle;
  }
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Unbekannt";
  }
}

async function parseSingleFeed(feedUrl: string): Promise<ParsedArticle[]> {
  const feed = await parser.parseURL(feedUrl);
  const articles: ParsedArticle[] = [];

  for (const item of feed.items) {
    if (!item.title || !item.link) continue;

    const contentRaw =
      (item as unknown as Record<string, string>).contentEncoded ||
      item.content ||
      item.contentSnippet ||
      "";

    articles.push({
      title: stripHtml(item.title),
      link: item.link,
      source: extractSource(item.link, feed.title),
      date: item.isoDate || item.pubDate || new Date().toISOString(),
      content: stripHtml(contentRaw).slice(0, 500),
      feedUrl,
    });
  }

  return articles;
}

export async function parseFeeds(feedUrls: string[]): Promise<{
  articles: ParsedArticle[];
  errors: { url: string; error: string }[];
}> {
  const results = await Promise.allSettled(
    feedUrls.map((url) => parseSingleFeed(url))
  );

  const articles: ParsedArticle[] = [];
  const errors: { url: string; error: string }[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      errors.push({
        url: feedUrls[index],
        error: result.reason?.message || "Unbekannter Fehler",
      });
    }
  });

  // Deduplicate by link
  const seen = new Set<string>();
  const unique = articles.filter((article) => {
    if (seen.has(article.link)) return false;
    seen.add(article.link);
    return true;
  });

  // Sort by date descending
  unique.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return { articles: unique, errors };
}
