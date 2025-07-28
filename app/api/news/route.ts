import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

interface Article {
  title: string;
  link: string;
  pubDate: string;
  image?: string;
  description: string;
  source: string;
}

function truncate(text: string, maxLength = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get("limit") || "20");

  try {
    const articles: Article[] = [];

    // Scrape 2 pages with correct URL structure - FAST
    for (let currentPage = 1; currentPage <= 2; currentPage++) {
      const url = `https://www.tokenpost.kr/news/blockchain?page=${currentPage}`;

      try {
        const { data } = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
          timeout: 1500, // Very fast timeout for quick loading
        });
        const $ = cheerio.load(data);

        const pageArticles = $(".list_left_item_article");

        pageArticles.each((_, el) => {
          // Extract image URL
          const imageUrl = $(el).find(".list_item_image a img").attr("src");

          // Extract title and link - look for the main article link
          const titleTag = $(el).find(".list_item_title a");
          const title = titleTag.text().trim();
          let link = titleTag.attr("href") || "";

          // Convert relative links to absolute URLs
          if (link.startsWith("/")) {
            link = "https://www.tokenpost.kr" + link;
          }

          // Extract publication date from the time element
          const pubDate = $(el).find(".date_item .day").text().trim();

          // Extract description from the text content
          const descriptionText = $(el)
            .find(".list_item_text_content")
            .text()
            .trim();
          const description = truncate(descriptionText, 150);

          // Check for duplicates by link
          const articleExists = articles.some(
            (existing) => existing.link === link
          );

          if (!articleExists && title && link) {
            articles.push({
              title,
              link,
              pubDate,
              image: imageUrl,
              description,
              source: "TokenPost",
            });
          }

          // If we've reached the requested limit, stop processing
          if (articles.length >= limit) {
            return false; // Break out of the .each() loop
          }
        });
      } catch (_error) {
        break; // Stop if we get an error
      }
    }

    return NextResponse.json({ articles });
  } catch (error: unknown) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: (error as Error).toString() },
      { status: 500 }
    );
  }
}
