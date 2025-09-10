import { Post } from "@/types/post";

// Server-side data fetching function for board data
export async function getBoardData(): Promise<{
  "free-board": Post[];
  "education-board": Post[];
  "profit-board": Post[];
}> {
  try {
    // Use absolute URL for server-side fetching (works during build/SSG)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/boards`);

    if (!response.ok) {
      throw new Error("Failed to fetch board data");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching board data:", error);
    return {
      "free-board": [],
      "education-board": [],
      "profit-board": [],
    };
  }
}
